 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeVault is ReentrancyGuard {
    IERC20 public immutable token;
    uint256 public immutable rewardRateBps;

    struct Compartment {
        uint256 amount;
        uint256 startTime;
        uint256 unlockTime;
        bool active;
    }

    mapping(address => Compartment) private compartments;

    event TokensLocked(
        address indexed user,
        uint256 amount,
        uint256 unlockTime
    );

    event TokensUnlocked(address indexed user, uint256 amount);

    constructor(address tokenAddress, uint256 rateBps) {
        require(tokenAddress != address(0), "Invalid token");
        require(rateBps <= 10000, "Rate too high");

        token = IERC20(tokenAddress);
        rewardRateBps = rateBps;
    }

    function lockTokens(
        uint256 amount,
        uint256 duration
    ) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(duration > 0, "Duration must be positive");
        require(!compartments[msg.sender].active, "Compartment active");

        uint256 unlockTime = block.timestamp + duration;

        compartments[msg.sender] = Compartment({
            amount: amount,
            startTime: block.timestamp,
            unlockTime: unlockTime,
            active: true
        });

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit TokensLocked(msg.sender, amount, unlockTime);
    }

    function calculateReward() external view returns (uint256) {
        Compartment memory c = compartments[msg.sender];

        if (!c.active || block.timestamp <= c.startTime) {
            return 0;
        }

        uint256 elapsed = block.timestamp < c.unlockTime
            ? block.timestamp - c.startTime
            : c.unlockTime - c.startTime;

        return (c.amount * rewardRateBps * elapsed)
            / (10000 * 365 days);
    }

    function unlockTokens() external nonReentrant {
        Compartment storage c = compartments[msg.sender];

        require(c.active, "No active compartment");
        require(block.timestamp >= c.unlockTime, "Still locked");

        uint256 amount = c.amount;

        c.active = false;
        c.amount = 0;

        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit TokensUnlocked(msg.sender, amount);
    }

    function getMyCompartment()
        external
        view
        returns (Compartment memory)
    {
        return compartments[msg.sender];
    }
}
