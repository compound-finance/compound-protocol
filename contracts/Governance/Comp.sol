pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "../EIP20Interface.sol";
import "../SafeMath.sol";

/**
 * @title Compound's Governance Token Contract
 * @notice Immutable tokens for Compound Governors
 * @author Compound
 */
contract Comp is EIP20Interface {
    using SafeMath for uint;

    /// @notice EIP-20 token name for this token
    string public constant name = "Compound Governance Token";

    /// @notice EIP-20 token symbol for this token
    string public constant symbol = "COMP";

    /// @notice EIP-20 token decimals for this token
    uint8 public constant decimals = 18;

    /// @notice Total number of tokens in circulation
    uint public constant totalSupply = 10000000e18; // 10 million Comp

    /// @notice Official record of token balances for each account
    mapping (address => uint) public balanceOf;

    /// @notice Allowance amounts on behalf of others
    mapping (address => mapping (address => uint)) public allowance;

    /// @notice A record of each accounts delegate
    mapping (address => address) public delegates;

    /// @notice A checkpoint for marking number of votes from a given block
    struct Checkpoint {
        uint32 fromBlock;
        uint96 votes;
    }

    /// @notice A record of votes checkpoints for each account, by index
    mapping (address => mapping (uint32 => Checkpoint)) public checkpoints;

    /// @notice The number of checkpoints for each account
    mapping (address => uint32) public numCheckpoints;

    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the delegation struct used by the contract
    bytes32 public constant DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    /// @notice A record of states for signing / validating signatures
    mapping (address => uint) public nonces;

    /// @notice An event thats emitted when an account changes their delegate
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice An event thats emitted when a delegate account's vote balance changes
    event DelegateVotesChanged(address indexed delegate, uint previousBalance, uint newBalance);

    /**
     * @notice Construct a new Comp token
     * @param account The initial account to grant all the tokens
     */
    constructor(address account) public {
        balanceOf[account] = totalSupply;
        emit Transfer(address(0), account, totalSupply);
    }

    /**
     * @notice Approve `spender` to transfer up to `amount` from `src`
     * @dev This will overwrite the approval amount for `spender`
     *  and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved (2^256-1 means infinite)
     * @return Whether or not the approval succeeded
     */
    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer `amount` tokens from `msg.sender` to `dst`
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transfer(address dst, uint amount) external returns (bool) {
        _transferTokens(msg.sender, dst, amount);
        return true;
    }

    /**
     * @notice Transfer `amount` tokens from `src` to `dst`
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transferFrom(address src, address dst, uint amount) external returns (bool) {
        address spender = msg.sender;
        uint spenderAllowance = allowance[src][spender];

        if (spender != src && spenderAllowance != uint(-1)) {
            uint newAllowance = spenderAllowance.sub(amount, "Comp::transferFrom: transfer amount exceeds spender allowance");
            allowance[src][spender] = newAllowance;

            emit Approval(src, spender, newAllowance);
        }

        _transferTokens(src, dst, amount);
        return true;
    }

    /**
     * @notice Delegate votes from `msg.sender` to `delegatee`
     * @param delegatee The address to delegate votes to
     */
    function delegate(address delegatee) public {
        return _delegate(msg.sender, delegatee);
    }

    /**
     * @notice Delegates votes from signatory to `delegatee`
     * @param delegatee The address to delegate votes to
     * @param nonce The contract state required to match the signature
     * @param expiry The time at which to expire the signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    function delegateBySig(address delegatee, uint nonce, uint expiry, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 domainSeparator = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), getChainId(), address(this)));
        bytes32 structHash = keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        require(signatory != address(0), "Comp::delegateBySig: invalid signature");
        require(nonce == nonces[signatory]++, "Comp::delegateBySig: invalid nonce");
        require(now <= expiry, "Comp::delegateBySig: signature expired");
        return _delegate(signatory, delegatee);
    }

    /**
     * @notice Gets the current votes balance for `account`
     * @param account The address to get votes balance
     * @return The number of current votes for `account`
     */
    function getCurrentVotes(address account) external view returns (uint96) {
        uint32 length = numCheckpoints[account];
        return length == 0 ? 0 : checkpoints[account][length - 1].votes;
    }

    /**
     * @notice Determine the prior number of votes for an account as of a block number
     * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
     * @param account The address of the account to check
     * @param blockNumber The block number to get the vote balance at
     * @return The number of votes the account had as of the given block
     */
    function getPriorVotes(address account, uint blockNumber) public view returns (uint96) {
        require(blockNumber < block.number, "Comp::getPriorVotes: not yet determined");

        uint32 length = numCheckpoints[account];
        if (length == 0) {
            return 0;
        }

        // First check most recent balance
        if (checkpoints[account][length - 1].fromBlock <= blockNumber) {
            return checkpoints[account][length - 1].votes;
        }

        // Next check implicit zero balance
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }

        uint32 lower = 0;
        uint32 upper = length - 1;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }

    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint delegatorBalance = balanceOf[delegator];
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        if (currentDelegate != delegatee && delegatorBalance > 0) {
            _decreaseVotes(currentDelegate, delegatorBalance);
            _increaseVotes(delegatee, delegatorBalance);
        }
    }

    function _pushCheckpoint(address delegatee, uint fromBlock, uint96 votes) internal {
        require(fromBlock < 2**32, "Comp::_pushCheckpoint: block number exceeds 32 bits");
        checkpoints[delegatee][numCheckpoints[delegatee]++] = Checkpoint(uint32(fromBlock), votes);
    }

    function _transferTokens(address src, address dst, uint amount) internal {
        require(src != address(0), "Comp::_transferTokens: cannot transfer from the zero address");
        require(dst != address(0), "Comp::_transferTokens: cannot transfer to the zero address");

        balanceOf[src] = balanceOf[src].sub(amount, "Comp::_transferTokens: transfer amount exceeds balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Comp::_transferTokens: transfer amount overflows");
        emit Transfer(src, dst, amount);

        address srcDelegate = delegates[src];
        address dstDelegate = delegates[dst];
        if (srcDelegate != dstDelegate) {
            _decreaseVotes(srcDelegate, amount);
            _increaseVotes(dstDelegate, amount);
        }
    }

    function _decreaseVotes(address delegatee, uint amount) internal {
        if (delegatee == address(0)) {
            return;
        }

        uint32 length = numCheckpoints[delegatee];

        Checkpoint storage currentCheckpoint = checkpoints[delegatee][length - 1];
        uint96 currentVotes = currentCheckpoint.votes;
        uint96 newVotesAmount = uint96(uint(currentVotes).sub(amount, "Comp::_decreaseVotes: vote amount exceeds previous vote balance"));

        if (currentCheckpoint.fromBlock < block.number) {
            _pushCheckpoint(delegatee, block.number, newVotesAmount);
        } else {
            currentCheckpoint.votes = newVotesAmount;
        }

        emit DelegateVotesChanged(delegatee, uint(currentVotes), uint(newVotesAmount));
    }

    function _increaseVotes(address delegatee, uint amount) internal {
        if (delegatee == address(0)) {
            return;
        }

        uint32 length = numCheckpoints[delegatee];

        uint96 currentVotesAmount;
        uint96 newVotesAmount;

        if (length == 0) {
            currentVotesAmount = 0;
            newVotesAmount = uint96(amount);
            _pushCheckpoint(delegatee, block.number, newVotesAmount);
        } else if (checkpoints[delegatee][length - 1].fromBlock < block.number) {
            currentVotesAmount = checkpoints[delegatee][length - 1].votes;
            newVotesAmount = uint96(uint(currentVotesAmount).add(amount, "Comp::_increaseVotes: vote amount overflows"));
            _pushCheckpoint(delegatee, block.number, newVotesAmount);
        } else {
            currentVotesAmount = checkpoints[delegatee][length - 1].votes;
            newVotesAmount = uint96(uint(currentVotesAmount).add(amount, "Comp::_increaseVotes: vote amount overflows"));
            checkpoints[delegatee][length - 1].votes = newVotesAmount;
        }

        emit DelegateVotesChanged(delegatee, currentVotesAmount, newVotesAmount);
    }

    function getChainId() internal pure returns (uint) {
        uint256 chainId;
        assembly { chainId := chainid() }
        return chainId;
    }
}
