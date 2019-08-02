pragma solidity ^0.5.8;

import "truffle/Assert.sol";
import "../contracts/CarefulMath.sol";

contract CarefulMathTest is CarefulMath {

    function testStandardAddition() public {
        (MathError err, uint val) = addUInt(5, 6);

        assertNoError(err);
        Assert.equal(11, val, "should compute addition correctly");
    }

    function testAddZeroLeft() public {
        (MathError err, uint val) = addUInt(0, 6);

        assertNoError(err);
        Assert.equal(6, val, "should compute addition correctly");
    }

    function testAddZeroRight() public {
        (MathError err, uint val) = addUInt(6, 0);

        assertNoError(err);
        Assert.equal(6, val, "should compute addition correctly");
    }

    function testAdditiveOverflow() public {
        (MathError err, uint val) = addUInt(5, uint(-1));

        assertError(MathError.INTEGER_OVERFLOW, err, "should have error INTEGER_OVERFLOW");
        Assert.equal(0, val, "should have default value");
    }

    function testStandardSubtraction() public {
        (MathError err, uint val) = subUInt(1000, 250);

        assertNoError(err);
        Assert.equal(750, val, "should compute subtraction correctly");
    }

    function testSubtractZero() public {
        (MathError err, uint val) = subUInt(1000, 0);

        assertNoError(err);
        Assert.equal(1000, val, "should compute subtraction correctly");
    }

    function testSubtractFromZero() public {
        (MathError err, uint val) = subUInt(0, 1000);

        assertError(MathError.INTEGER_UNDERFLOW, err, "should have error INTEGER_UNDERFLOW");
        Assert.equal(0, val, "should compute subtraction correctly");
    }

    function testSubtractiveUnderflow() public {
        (MathError err, uint val) = subUInt(250, 1000);

        assertError(MathError.INTEGER_UNDERFLOW, err, "should have error INTEGER_UNDERFLOW");
        Assert.equal(0, val, "should compute subtraction correctly");
    }

    function testStandardMultiplication() public {
        (MathError err, uint val) = mulUInt(100, 7);

        assertNoError(err);
        Assert.equal(700, val, "should compute multiplication correctly");
    }

    function testStandardMultiplicationByZeroLeft() public {
        (MathError err, uint val) = mulUInt(0, 100);

        assertNoError(err);
        Assert.equal(0, val, "should compute multiplication correctly");
    }

    function testStandardMultiplicationByZeroRight() public {
        (MathError err, uint val) = mulUInt(100, 0);

        assertNoError(err);
        Assert.equal(0, val, "should compute multiplication correctly");
    }

    function testMultiplicativeOverflow() public {
        (MathError err, uint val) = mulUInt(uint(-1), 3);

        assertError(MathError.INTEGER_OVERFLOW, err, "should have error INTEGER_OVERFLOW");
        Assert.equal(0, val, "should have default value");
    }

    function testLargeNumberIdentityMultiplication() public {
        (MathError err, uint val) = mulUInt(uint(-1), 1);

        assertNoError(err);
        Assert.equal(uint(-1), val, "should compute multiplication correctly");
    }

    function testStandardDivision() public {
        (MathError err, uint val) = divUInt(100, 5);

        assertNoError(err);
        Assert.equal(20, val, "should compute division correctly");
    }

    function testDivisionWithTruncation() public {
        (MathError err, uint val) = divUInt(100, 33);

        assertNoError(err);
        Assert.equal(3, val, "should compute division correctly");
    }

    function testDivisionOfZero() public {
        (MathError err, uint val) = divUInt(0, 8);

        assertNoError(err);
        Assert.equal(0, val, "should compute division correctly");
    }

    function testDivisionByZero() public {
        (MathError err, uint val) = divUInt(8, 0);

        assertError(MathError.DIVISION_BY_ZERO, err, "should have error DIVISION_BY_ZERO");
        Assert.equal(0, val, "should have default value");
    }

    function testLargeNumberIdentityDivision() public {
        (MathError err, uint val) = divUInt(uint(-1), 1);

        assertNoError(err);
        Assert.equal(uint(-1), val, "should compute multiplication correctly");
    }


    function testAddThenSub() public {
        (MathError err, uint val) = addThenSubUInt(1, 3, 2);

        assertNoError(err);
        Assert.equal(2, val, "should perform operations in the stated order"); // 1 - 2 before adding 3 would underflow
    }

    function testAddThenSubOverflow() public {
        (MathError err, uint val) = addThenSubUInt(2**256 - 1, 2**256 - 1, 5);
        assertError(MathError.INTEGER_OVERFLOW, err, "should have error INTEGER_OVERFLOW");

        Assert.equal(0, val, "should have default value");
    }

    function testAddThenSubUnderflow() public {
        (MathError err, uint val) = addThenSubUInt(1, 2, 5);
        assertError(MathError.INTEGER_UNDERFLOW, err, "should have error INTEGER_UNDERFLOW");

        Assert.equal(0, val, "should have default value");
    }

    function assertError(MathError expected, MathError given, string memory message) internal {
        Assert.equal(uint(expected), uint(given), message);
    }

    function assertNoError(MathError err) internal {
        assertError(MathError.NO_ERROR, err, "should have error NO_ERROR");
    }

    function assertZero(uint value, string memory message) internal {
        Assert.equal(0, value, message);
    }
}