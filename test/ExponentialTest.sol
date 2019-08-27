pragma solidity ^0.5.8;

import "truffle/Assert.sol";
import "../contracts/Exponential.sol";

contract ExponentialTest is Exponential {

    /**
      * @dev helper that lets us create an Exp with `getExp` without cluttering our test code with error checks of the setup.
      */
    function getExpFromRational(uint numerator, uint denominator) internal returns (Exp memory) {
        (MathError err, Exp memory result) = getExp(numerator, denominator);

        Assert.equal(0, uint(err), "getExpFromRational failed");
        return result;
    }

    function testGetExp_Simple() public {
        (MathError err, Exp memory val) = getExp(50, 10000); // 50 basis points

        assertNoError(err);
        Assert.equal(5000000000000000, val.mantissa, "should be 50 basis points");
    }

    function testGetExp_WithDenomOfOne() public {
        (MathError err, Exp memory val) = getExp(5, 1); // The number 5.0

        assertNoError(err);
        Assert.equal(5000000000000000000, val.mantissa, "should be 5.0");
    }

    function testGetZero_Zero() public {
        (MathError err, Exp memory val) = getExp(0, 10000); // 0 basis points

        assertNoError(err);
        Assert.equal(0, val.mantissa, "should be 0 basis points");
    }

    function testGetExp_FailToGetDivByZero() public {
        (MathError err, Exp memory val) = getExp(1, 0);

        assertError(MathError.DIVISION_BY_ZERO, err, "divide by zero");
        assertZero(val.mantissa, "default value");
    }

    function testGetExp_Overflow() public {
        (MathError err, Exp memory val) = getExp(uint(-1), uint(-1)); // 1, but overflows

        assertError(MathError.INTEGER_OVERFLOW, err, "overflows max int");
        assertZero(val.mantissa, "default value");
    }

    function testAddExp_Successful() public {
        (MathError err0, Exp memory val1) = getExp(50, 10000); // 50 basis points
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(60, 10000); // 60 basis points
        assertNoError(err1);

        (MathError err2, Exp memory sum) = addExp(val1, val2);
        assertNoError(err2);

        Assert.equal(11000000000000000, sum.mantissa, "should be 110 basis points");
    }

    function testAddExp_Overflow() public {
        Exp memory val1 = Exp({mantissa: uint(-1)});
        Exp memory val2 = Exp({mantissa: uint(-1)});

        (MathError err, Exp memory sum) = addExp(val1, val2);

        assertError(MathError.INTEGER_OVERFLOW, err, "overflowed with addition");
        assertZero(sum.mantissa, "default value");
    }

    function testSubExp_Successful() public {
        (MathError err0, Exp memory val1) = getExp(50, 10000); // 50 basis points
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(60, 10000); // 60 basis points
        assertNoError(err1);

        (MathError err2, Exp memory difference) = subExp(val2, val1);
        assertNoError(err2);

        Assert.equal(1000000000000000, difference.mantissa, "should be 10 basis points");

        // -1 - (-1) should actually work out to 0
        (MathError err3, Exp memory difference2) = subExp(Exp({mantissa: uint(-1)}), Exp({mantissa: uint(-1)}));
        assertNoError(err3);

        Assert.equal(0, difference2.mantissa, "should be 0 basis points");
    }

    function testSubExp_Underflow() public {
        (MathError err0, Exp memory val1) = getExp(5, 1);
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(7, 1);
        assertNoError(err1);

        (MathError err2, Exp memory difference) = subExp(val1, val2); // 5 - 7 = underflow

        assertError(MathError.INTEGER_UNDERFLOW, err2, "underflowed with subtraction");
        assertZero(difference.mantissa, "default value");
    }

    function testMulExp_Successful() public {

        (MathError err0, Exp memory val1) = getExp(50, 100); // 1/2
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(202, 100); // 2.02
        assertNoError(err1);

        (MathError err2, Exp memory product) = mulExp(val1, val2);

        assertNoError(err2);
        Assert.equal(1010000000000000000, product.mantissa, "product should be 1.01");
    }

    function testMulExp3_Successful() public {
        (MathError err0, Exp memory val1) = getExp(1, 2);
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(1, 3);
        assertNoError(err1);

        (MathError err2, Exp memory val3) = getExp(1, 5);
        assertNoError(err2);

        (MathError err3, Exp memory product) = mulExp3(val1, val2, val3);
        assertNoError(err3);
        Assert.equal(33333333333333333, product.mantissa, "product should be 1/30");
    }

    function testMulExp3_Small() public {
        (MathError err0, Exp memory val1) = getExp(1, 2);
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(1, 1e18);
        assertNoError(err1);

        (MathError err2, Exp memory val3) = getExp(1, 1);
        assertNoError(err2);

        (MathError err3, Exp memory product) = mulExp3(val1, val2, val3);
        assertNoError(err3);
        Assert.equal(1, product.mantissa, "product should be 5e-19, rounded to 1e-18");
    }

    // This fails without the addition of the half scale before descaling the intermediate value
    function testMulExp_RoundAtFarRight() public {

        (MathError err0, Exp memory val1) = getExp(2, 3); // 2/3
        assertNoError(err0);

        (MathError err1, Exp memory val2) = getExp(1, 10**18); // 1x10e-18
        assertNoError(err1);

        (MathError err2, Exp memory product) = mulExp(val1, val2);

        assertNoError(err2); // 2/3 * 1x10e-18 = 6.6... x 10e-19
        Assert.equal(1, product.mantissa, "product should be 6.666E-19, rounded to 1e-18");
    }

    function testMulExp_ZeroLeft() public {

        (MathError err0, Exp memory left) = getExp(0, 100); // 0
        assertNoError(err0);

        (MathError err1, Exp memory right) = getExp(202, 100); // 2.02
        assertNoError(err1);

        (MathError err2, Exp memory product) = mulExp(left, right);

        assertNoError(err2);
        Assert.equal(0, product.mantissa, "product should be 0");
    }

    function testMulExp_ZeroRight() public {

        (MathError err0, Exp memory right) = getExp(0, 100); // 0
        assertNoError(err0);

        (MathError err1, Exp memory left) = getExp(202, 100); // 2.02
        assertNoError(err1);

        (MathError err2, Exp memory product) = mulExp(left, right);

        assertNoError(err2);
        Assert.equal(0, product.mantissa, "product should be 0");
    }

    function testMulExp_OneLeft() public {

        (MathError err0, Exp memory left) = getExp(1, 1); // 1
        assertNoError(err0);

        (MathError err1, Exp memory right) = getExp(202, 100); // 2.02
        assertNoError(err1);

        (MathError err2, Exp memory product) = mulExp(left, right);

        assertNoError(err2);
        Assert.equal(2020000000000000000, product.mantissa, "product should be 2.02");
    }

    function testMulExp_OneRight() public {

        (MathError err0, Exp memory right) = getExp(1, 1); // 1
        assertNoError(err0);

        (MathError err1, Exp memory left) = getExp(202, 100); // 2.02
        assertNoError(err1);

        (MathError err2, Exp memory product) = mulExp(left, right);

        assertNoError(err2);
        Assert.equal(2020000000000000000, product.mantissa, "product should be 2.02");
    }

    function testMulExp_Overflow() public {
        Exp memory val1 = Exp({mantissa: uint(-1)});
        Exp memory val2 = Exp({mantissa: uint(-1)});

        (MathError err, Exp memory product) = mulExp(val1, val2);

        assertError(MathError.INTEGER_OVERFLOW, err, "overflowed with multiplication");
        assertZero(product.mantissa, "default value");
    }

    function testMulExp_OverflowOnAddHalfScale() public {
        Exp memory bigger = Exp({mantissa: (2**256) - 1});
        Exp memory smaller = Exp({mantissa: 1});

        MathError err;
        Exp memory product;

        (err, product) = mulExp(bigger, smaller);
        assertError(MathError.INTEGER_OVERFLOW, err, "should have returned MathError.INTEGER_OVERFLOW");

        Assert.equal(0, product.mantissa, "product should be zero");
    }

    function testMulScalar_Big() public {
        Exp memory val = getExpFromRational(10**58, 1); // Exp({mantissa: 10**76}); // our scaled representation of 10e59

        Assert.equal(10**76, val.mantissa, "setup failed val.mantissa not 10e76");

        (MathError err0, Exp memory scaled1) = mulScalar(val, 5);
        assertNoError(err0);
        Assert.equal(uint(5 * 10**76), scaled1.mantissa, "scalar multiplication failed- scaled1.mantissa not 50e76");

        (MathError err1, Exp memory scaled2) = mulScalar(val, 100);
        assertError(MathError.INTEGER_OVERFLOW, err1, "should have overflowed with scalar multiplication");
        Assert.equal(0, scaled2.mantissa, "should have overflowed");
    }

    function testMulScalar_Small() public {
        Exp memory val = getExpFromRational(1, 10**16); // our scaled representation of 10e-16.

        Assert.equal(100, val.mantissa, "setup failed val2.mantissa not 100");

        (MathError err0, Exp memory scaled) = mulScalar(val, 5);
        assertNoError(err0);
        Assert.equal(500, scaled.mantissa, "scalar multiplication failed- scaled2.mantissa not 500");
    }

    function testDivScalar_Big() public {
        Exp memory val = getExpFromRational(10**58, 1); // Exp({mantissa: 10**76}); // our scaled representation of 10e59

        Assert.equal(10**76, val.mantissa, "setup failed val.mantissa not 10e76");

        (MathError err0, Exp memory scaled1) = divScalar(val, 5);
        assertNoError(err0);
        Assert.equal(uint(2 * 10**75), scaled1.mantissa, "scalar division failed- scaled1.mantissa not 2e76");

        (MathError err1, Exp memory scaled2) = divScalar(val, 0);
        assertError(MathError.DIVISION_BY_ZERO, err1, "should have caused division by zero");
        Assert.equal(0, scaled2.mantissa, "should be nilish");
    }

    function testDivScalar_Small() public {
        Exp memory val = getExpFromRational(1, 10**16); // our scaled representation of 10e-16.

        Assert.equal(100, val.mantissa, "setup failed val.mantissa not 100");

        (MathError err0, Exp memory scaled) = divScalar(val, 5);
        assertNoError(err0);
        Assert.equal(20, scaled.mantissa, "scalar division failed- scaled.mantissa not 20");
    }

    function testTruncate() public {
        Assert.equal(10**58, truncate(getExpFromRational(10**58, 1)), "should truncate to 10**58");
        Assert.equal(0, truncate(getExpFromRational(1, 2)), "should truncate to 0");
        Assert.equal(0, truncate(getExpFromRational(2, 3)), "should truncate to 0");
        Assert.equal(1, truncate(getExpFromRational(3, 2)), "should truncate to 1");
        Assert.equal(8, truncate(getExpFromRational(4000, 500)), "should truncate to 8");
        Assert.equal(10**5, truncate(getExpFromRational(10**20, 10**15)), "should truncate to 2000");
    }

    function testIsZeroExp() public {

        Assert.equal(true, isZeroExp(getExpFromRational(0, 1)), "zero should be zero");
        Assert.equal(true, isZeroExp(getExpFromRational(0, 10**58)), "zero from a large denominator should be zero");

        Assert.equal(false, isZeroExp(getExpFromRational(10**58, 3)), "large rational should not be zero");
        Assert.equal(false, isZeroExp(getExpFromRational(10**58, 1)), "large integer should not be zero");
        Assert.equal(false, isZeroExp(getExpFromRational(1, 1)), "small integer should not be zero");

        Exp memory tinyFraction = getExpFromRational(1, 10**18);
        Assert.equal(1, tinyFraction.mantissa, "tinyFraction setup failed");

        Assert.equal(false, isZeroExp(tinyFraction), "tiny fraction should not be zero");
    }

    // divExp just calls getExp, which is already tested, so here we just verify that it is passing the
    // correct arguments to getExp and check identities and error case
    function testDivExp() public {
        MathError err;
        Exp memory result;

        ////////////////////
        // Simple division
        Exp memory left = getExpFromRational(1, 1);
        Exp memory right = getExpFromRational(3, 1);
        (err, result)= divExp(left, right);
        assertNoError(err);

        Assert.equal(result.mantissa, 333333333333333333, "Exp division failed- result.mantissa not 333333333333333333");

        ////////////////////
        // Divide by 1
        left = getExpFromRational(3, 1);
        right = getExpFromRational(1, 1);
        (err, result)= divExp(left, right);
        assertNoError(err);

        Assert.equal(result.mantissa, left.mantissa, "Exp division by 1 failed- result.mantissa not left.mantissa");

        ////////////////////
        // Divide very small number by itself
        left = getExpFromRational(1, 10**16); // our scaled representation of 10e-16.

        (err, result) = divExp(left, left);
        assertNoError(err);

        Assert.equal(result.mantissa, 1000000000000000000, "Exp division failed- result.mantissa not 1000000000000000000");

        ////////////////////
        // Divide by 0 returns error
        left = getExpFromRational(1, 1000); // .001
        right = getExpFromRational(0, 1); // 0

        (err, result) = divExp(left, right);
        Assert.equal(uint(err), uint(MathError.DIVISION_BY_ZERO), "Exp division by 0 should have returned MathError.DIVISION_BY_ZERO");
        Assert.equal(result.mantissa, 0, "Exp division by 0 mantissa should be 0");
    }


    function testDivScalarByExp() public {
        MathError err;
        Exp memory result;

        ////////////////////
        // divide by 1
        (err, result) = divScalarByExp(300, getExpFromRational(1, 1));
        assertNoError(err);

        Assert.equal(result.mantissa, 300 * 10**18, "Exp division failed- result.mantissa not 300 * 10**18");

        ////////////////////
        // divide 0 by non-zero
        (err, result) = divScalarByExp(0, getExpFromRational(108, 1000));
        assertNoError(err);

        Assert.equal(result.mantissa, 0, "Exp division failed- result.mantissa not 0");

        ////////////////////
        // simple division by rational > 1: 300 / 1.6 = 187.5
        (err, result) = divScalarByExp(300, getExpFromRational(16, 10));
        assertNoError(err);

        Assert.equal(result.mantissa, 187500000000000000000, "Exp division failed- result.mantissa not 187500000000000000000");

        ////////////////////
        // simple division by rational < 1:  300 / .85 = 352.9411764705882352941176470588235294117647058823529411764...
        // scaled as 352941176470588235294
        (err, result) = divScalarByExp(300, getExpFromRational(85, 100));
        assertNoError(err);

        Assert.equal(result.mantissa, 352941176470588235294, "Exp division failed- result.mantissa not 352941176470588235294");

        ////////////////////
        // divide large uint by rational 123456789012 / 1.6 = 77160493132.5; scaled as 77160493132500000000000000000
        (err, result) = divScalarByExp(123456789012, getExpFromRational(16, 10));
        assertNoError(err);

        Assert.equal(result.mantissa, 77160493132500000000000000000, "Exp division failed- result.mantissa not 77160493132500000000000000000");

        ////////////////////
        // divide large uint by large rational
        // 123456789012 / 987654321012345.7 = 0.000124999998871524997371961899045794758369664776317619765...,
        // scaled as 124999998871525
        (err, result) = divScalarByExp(123456789012, getExpFromRational(9876543210123456, 10));
        assertNoError(err);

        Assert.equal(result.mantissa, 124999998871525, "Exp division failed- result.mantissa not 124999998871525");

        ////////////////////
        // overflow with large scalar > max Exp 2^237 - 1
        (err, result) = divScalarByExp(2**237, getExpFromRational(10, 1));

        Assert.equal(uint(err), uint(MathError.INTEGER_OVERFLOW), "scalar >= 2**237 should cause overflow when converted to Exp");

        ////////////////////
        // division by zero
        (err, result) = divScalarByExp(10, getExpFromRational(0, 1));

        Assert.equal(uint(err), uint(MathError.DIVISION_BY_ZERO), "division by zero should return error DIVISION_BY_ZERO");
    }


    function testLessThanOrEqualExp() public {

        // identity
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(1, 1), getExpFromRational(1, 1)), "1/1 <= itself");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(1, 3), getExpFromRational(1, 3)), "1/3 <= itself");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(3, 1), getExpFromRational(3, 1)), "3/1 <= itself");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(0, 1), getExpFromRational(0, 3)), "0  <= itself even with different demoninators");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(11 * 10**17, 3), getExpFromRational(110 * 10**16, 3)), "(11 * 10**17)/3  <= itself");

        // strictly less than
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(7, 9), getExpFromRational(1, 1)), "7/9 <= 1");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(1, 4), getExpFromRational(1, 3)), "1/4 <= 1/3");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(3, 2), getExpFromRational(3, 1)), "3/2 <= 3 ");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(100, 3), getExpFromRational(100, 2)), "100/3  <= 100/2");
        Assert.isTrue(lessThanOrEqualExp(getExpFromRational(10**18, 3), getExpFromRational(10**19, 3)), "10e18/3 <= 10e19/3");

        // Reverse the previous block of strictly less than tests
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(1, 1), getExpFromRational(7, 9)), "1 !<= 7/9 ");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(1, 3), getExpFromRational(1, 4)), "1/3 !<= 1/4");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(3, 1), getExpFromRational(3, 2)), "3 !<= 3/2");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(100, 2), getExpFromRational(100, 3)), "100/2 !<= 100/3");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(10**19, 3), getExpFromRational(10**18, 3)), "10e19/3 !<= 10e18/3");

        // Let's do some more failure cases
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(3, 1), getExpFromRational(1, 3)), "3/1 and 1/3");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(3, 1), getExpFromRational(1, 1)), "3/1 and 1/1");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(3, 1), getExpFromRational(0, 1)), "3/1 and 0/1");
        Assert.isFalse(lessThanOrEqualExp(getExpFromRational(30, 1), getExpFromRational(3, 1)), "30/1 and 3/1");
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