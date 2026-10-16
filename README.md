# BNB Safe Vault

A beginner-friendly smart contract project for locking ERC-20 tokens on BNB Chain and calculating estimated rewards over time.

## Features

- Lock ERC-20 tokens for a chosen duration.
- Keep each user's token compartment separate.
- Calculate estimated rewards based on the lock period.
- Unlock tokens after the lock expires.
- Protect token operations with reentrancy protection.
- Run automated tests using Hardhat and GitHub Actions.
- Provide a simple frontend for wallet interaction.

## Technology Stack

- Solidity
- OpenZeppelin Contracts
- Hardhat
- JavaScript
- Ethers.js
- HTML and CSS
- GitHub Actions

## Project Structure

```text
bnb-safe-vault/
├── contracts/
│   ├── SafeVault.sol
│   └── MockToken.sol
├── test/
│   └── SafeVault.test.js
├── frontend/
│   └── index.html
├── .github/
│   └── workflows/
│       └── solidity.yml
├── package.json
└── hardhat.config.js
```

## How It Works

1. A user connects a wallet.
2. The user approves the vault to transfer ERC-20 tokens.
3. The user locks tokens for a specified duration.
4. The contract calculates estimated rewards without distributing them.
5. The user can retrieve the locked tokens after the lock period expires.

## Development Status

This project is a learning and portfolio project. Automated tests are configured through GitHub Actions.

The frontend requires a deployed contract and compatible ERC-20 token on the selected test network.

## Security Notice

This project has not undergone a professional security audit. Use test tokens on a test network only. Do not deposit real funds.

## Author

Ahmad Choirudin

GitHub: https://github.com/ahmad-choirudin
