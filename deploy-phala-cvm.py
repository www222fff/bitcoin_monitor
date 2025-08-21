import os
import json
import base64
import secrets
from pathlib import Path
from typing import List, Dict, Any, Union

import httpx
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# Phala API client setup
class PhalaCVMClient:
    def __init__(self, base_url: str = "https://cloud-api.phala.network/api/v1"):
        self.base_url = base_url
        self.client = httpx.Client(
            base_url=base_url,
            headers={
                'Content-Type': 'application/json',
                'x-api-key': os.getenv('PHALA_CLOUD_API_KEY'),
            }
        )

    def get_pubkey(self, vm_config: Dict[str, Any]) -> Dict[str, str]:
        response = self.client.post("/cvms/pubkey/from_cvm_configuration", json=vm_config)
        response.raise_for_status()
        return response.json()
    
    def get_existed_pubkey(self, identifier: str) -> Dict[str, str]:
        response = self.client.get(f"/cvms/{identifier}/compose")
        response.raise_for_status()
        return response.json()

    def create_vm(self, config: Dict[str, Any]) -> Dict[str, Any]:
        response = self.client.post("/cvms/from_cvm_configuration", json=config)
        response.raise_for_status()
        return response.json()

    def get_existing_vm(self) -> Union[Dict[str, Any], None]:
        response = self.client.get(f"/cvms?user_id=0")
        response.raise_for_status()
        vms = response.json()
        if vms:
            vm = vms[0]
            return {
                "app_id": vm["hosted"]["app_id"]
            }
        return None

    def update_vm(self, identifier: str, compose_manifest: Dict[str, Any]) -> Dict[str, Any]:
        max_retries = 3
        for attempt in range(max_retries + 1):
            try:
                response = self.client.put(
                    f"/cvms/{identifier}/compose",
                    json=compose_manifest,
                    timeout=10
                )
                response.raise_for_status()
                return response.json()
            except:
                if attempt == max_retries:
                    print(f"Retry {max_retries} times still failed")
                    raise

def encrypt_env_vars(envs: List[Dict[str, str]], public_key_hex: str) -> str:
    # Convert environment variables to JSON
    envs_json = json.dumps({"env": envs})

    # Generate private key and get public key
    private_key = x25519.X25519PrivateKey.generate()
    public_key = private_key.public_key()
    my_public_bytes = public_key.public_bytes_raw()

    # Convert remote public key from hex and create public key object
    remote_public_key_bytes = bytes.fromhex(public_key_hex.replace("0x", ""))
    remote_public_key = x25519.X25519PublicKey.from_public_bytes(remote_public_key_bytes)

    # Generate shared key
    shared_key = private_key.exchange(remote_public_key)

    # Generate random IV
    iv = secrets.token_bytes(12)

    # Encrypt data
    aesgcm = AESGCM(shared_key)
    encrypted_data = aesgcm.encrypt(iv, envs_json.encode(), None)

    # Combine all components
    result = my_public_bytes + iv + encrypted_data
    return result.hex()

async def deploy(teepod_id: int, image: str) -> Dict[str, Any]:

    docker_compose = """
services:
  bitcoind:
    image: ghcr.io/${DOCKER_REGISTRY_USERNAME_KEY}/bitcoin_monitor:latest
    pull_policy: always
    container_name: bitcoind
    ports:
      - "8332:8332"
    volumes:
      - /var/run/tappd.sock:/var/run/tappd.sock
      - tee:/home/bitcoin/.bitcoin
    environment:
      - TEE_MODE=PRODUCTION
    restart: always

  web:
    image: ghcr.io/${DOCKER_REGISTRY_USERNAME_KEY}/bitcoin_web:latest
    pull_policy: always
    container_name: bitcoin-web
    ports:
      - "4001:4001"
    environment:
      - RPC_HOST=bitcoind
      - RPC_PORT=8332
      - RPC_USER=he
      - RPC_PASSWORD=shuang
      - WEB_PORT = 4001
    depends_on:
      - bitcoind
    restart: unless-stopped

volumes:
    tee:"""

    vm_config = {
        "name": "bitcoin_monitor",
        "compose_manifest": {
            "name": "bitcoin_monitor",
            "features": ["kms", "tproxy-net"],
            "docker_compose_file": docker_compose,
        },
        "vcpu": 2,
        "memory": 4096,
        "disk_size": 40,
        "teepod_id": teepod_id,
        "image": image,
        "advanced_features": {
            "tproxy": True,
            "kms": True,
            "public_sys_info": True,
            "public_logs": True,
            "docker_config": {
                "password": os.getenv('DOCKER_REGISTRY_PASSWORD'),
                "registry": "ghcr.io",
                "username": os.getenv('DOCKER_REGISTRY_USERNAME'),
            },
            "listed": False,
        }
    }

    encrypted_envs = [
        {
            "key": "DOCKER_REGISTRY_USERNAME_KEY",
            "value": os.getenv("DOCKER_REGISTRY_USERNAME"),
        },
    ]

    try:
        client = PhalaCVMClient()
        existing_vm = client.get_existing_vm()

        if existing_vm:
            identifier = "app_" + existing_vm["app_id"]
            print(f"Updating existing VM: {identifier}")
            # Step 1: Get encryption public key
            compose = client.get_existed_pubkey(identifier)
            print('pubkey:', compose["env_pubkey"])

            # Step 2: Encrypt environment variables
            encrypted_env = encrypt_env_vars(
                encrypted_envs,
                compose["env_pubkey"],
            )
            # Step 3: Update cvm
            response = client.update_vm(identifier, {
                "compose_manifest": {
                    "name": identifier,
                    "features": ["kms", "tproxy-net"],
                    "docker_compose_file": docker_compose,
                    "manifest_version": 1,
                    "runner": "docker-compose",
                    "version": "1.0.0"
                },
                "encrypted_env": encrypted_env
            })
        else:
            # Step 1: Get new encryption public key
            with_pubkey = client.get_pubkey(vm_config)

            print('pubkey:', with_pubkey["app_env_encrypt_pubkey"])

            # Step 2: Encrypt environment variables
            encrypted_env = encrypt_env_vars(
                encrypted_envs,
                with_pubkey["app_env_encrypt_pubkey"],
            )
            # Step 3: Create VM with encrypted environment variables
            response = client.create_vm({
                **vm_config,
                "encrypted_env": encrypted_env,
                "app_env_encrypt_pubkey": with_pubkey["app_env_encrypt_pubkey"],
                "app_id_salt": with_pubkey["app_id_salt"],
            })

        return response
    except httpx.HTTPError as error:
        if error.response and error.response.status_code == 422:
            print('Failed to deploy CVM (422):', json.dumps(error.response.json(), indent=2))
        else:
            print('Failed to deploy CVM:', str(error))
        raise

async def main():
    default_config = {
        "teepod_id": 2,
        "image": "dstack-dev-0.3.6"
    }

    try:
        response = await deploy(**default_config)
        print('Deployment successful:', response)
        return response
    except Exception as error:
        print('Deployment failed:', str(error))
        raise

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
