// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";


interface IUnitroller {
    function initialize(address _admin) external;
    function _setPendingImplementation(address newPendingImplementation) public returns (uint256);
    function _acceptImplementation() public returns (uint256);
}

interface IComptroller {
    function initialize(address _admin) external;
    function _become(Unitroller unitroller) external;
}


contract UnitrollerFactory is Ownable {
    
    address public unitrollerImplementation;
    address public comptrollerImplementation;
    // keep track of unitrollers and comptrollers
    mapping(address => address) public unitrollerComptrollerPair;

    event UnitrollerComptrollerCreated(address unitroller, address comptroller);
    event NewImplementationSet(address unitroller, address comptroller);
    event UnitrollerImplementationSet(address implementation);
    event ComptrollerImplementationSet(address implementation);

    constructor(
        address _unitrollerImplementation,
        address _comptrollerImplementation
    ) {
        unitrollerImplementation = _unitrollerImplementation;
        comptrollerImplementation = _comptrollerImplementation;
    }

    function setUnitrollerImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "invalid implementation");
        unitrollerImplementation = _implementation;

        emit UnitrollerImplementationSet(_implementation);
    }

    function setComptrollerImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "invalid implementation");
        comptrollerImplementation = _implementation;

        emit ComptrollerImplementationSet(_implementation);
    }

    // create unitroller/comptroller pair
    function createUniComptrollerPair(address _admin) external onlyOwner returns (address[2] memory instances) {
        require(_admin != address(0), "invalid admin address");
    
        address unitrollerInstance = Clones.clone(unitrollerImplementation);
        address comptrollerInstance = Clones.clone(comptrollerImplementation);

        // initialize both deployed instances
        IUnitroller(unitrollerInstance).initialize(_admin);
        IComptroller(comptrollerInstance).initialize(_admin);

        unitrollerComptrollerPair[unitrollerInstance] = comptrollerInstance;

        // set and accept new implementation
        _setAndAcceptNewImplementation(unitrollerInstance, comptrollerInstance);

        emit UnitrollerComptrollerCreated(unitrollerInstance, comptrollerInstance);
        instances = new address[2](unitrollerInstance, comptrollerInstance);
    }

    // an atomic way to set new comptroller implementation for unitroller
    // assumes that comptrollerImplementation has been previously updated
    function setNewComptrollerImplementation(
        address _unitroller,
        address _admin
    ) external onlyOwner isValidUnitroller(_unitroller) returns (address) {
        require(comptrollerImplementation != address(0), "invalid implementation");
        require(_admin != address(0), "invalid admin");
       
        // create new comptroller and associate with unitroller
        address comptrollerInstance = Clones.clone(comptrollerImplementation);
        IComptroller(comptrollerInstance).initialize(_admin);

        unitrollerComptrollerPair[_unitroller] = comptrollerInstance;

        _setAndAcceptNewImplementation(_unitroller, comptrollerInstance);

        emit NewImplementationSet(_unitroller, comptrollerInstance);
        return comptrollerInstance;
    }

    // set and accept new implementation
    function _setAndAcceptNewImplementation(address _unitroller, address _implementation) internal {
        IUnitroller(_unitroller)._setPendingImplementation(_implementation);
        IComptroller(_implementation)._become(unitrollerInstance);
    }

    modifier isValidUnitroller(address _unitroller) {
        require(unitrollerComptrollerPair[_unitroller] != address(0), "not valid unitroller");
        _;
    }
}