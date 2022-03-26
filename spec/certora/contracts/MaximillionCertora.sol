pragma solidity ^0.8.10;

import "../../../contracts/Maximillion.sol";

contract MaximillionCertora is Maximillion {
    constructor(CEther cEther_) public Maximillion(cEther_) {}

    function borrowBalance(address account) external returns (uint) {
        return cEther.borrowBalanceCurrent(account);
    }

    function etherBalance(address account) external returns (uint) {
        return account.balance;
    }

    function repayBehalf(address borrower) override public payable {
        return super.repayBehalf(borrower);
    }
}
