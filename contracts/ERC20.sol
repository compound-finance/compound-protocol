pragma solidity ^0.5.16;

import "./SafeMath.sol";

contract ERC20 {
    using SafeMath for uint;

    string public name;
    string public symbol;
    uint8 public decimals;
    uint  public totalSupply;
    address public operator;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    mapping (address => bool) public minters;

    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);
    event AddMinter(address indexed minter);
    event RemoveMinter(address indexed minter);
    event ChangeOperator(address indexed newOperator);

    modifier onlyOperator {
        require(msg.sender == operator, "ONLY OPERATOR");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint8 decimals_) public {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        operator = msg.sender;
        uint chainId;
        assembly {
            chainId := chainid
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    function changeOperator(address operator_) public onlyOperator {
        operator = operator_;
        emit ChangeOperator(operator_);
    }

    function addMinter(address minter_) public onlyOperator {
        minters[minter_] = true;
        emit AddMinter(minter_);
    }

    function removeMinter(address minter_) public onlyOperator {
        minters[minter_] = false;
        emit RemoveMinter(minter_);
    }

    function mint(address to, uint amount) public {
        require(minters[msg.sender] == true || msg.sender == operator, "ONLY MINTERS OR OPERATOR");
        _mint(to, amount);
    }

    function burn(uint amount) public {
        _burn(msg.sender, amount);
    }

    function _mint(address to, uint value) internal {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint value) internal {
        balanceOf[from] = balanceOf[from].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint value) private {
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        if (allowance[from][msg.sender] != uint(-1)) {
            allowance[from][msg.sender] = allowance[from][msg.sender].sub(value);
        }
        _transfer(from, to, value);
        return true;
    }

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'EXPIRED');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'INVALID_SIGNATURE');
        _approve(owner, spender, value);
    }
}