# Example: Access to Mathematical Functions

The following examples show how to access mathematical functions from an ESDL model description.

// calculate sine of x x = x + MathFcn.pi()/2; y = MathFcn.sin(x);

// calculate square root of arg if (arg > 0) return MathFcn.sqrt(arg);

// typecast continuous arg to logical return (MathFcn.Sign(arg) = 0 ? false : true);

// fill array at x-1 with 1/x udisc x cont tmp, y;

for (x = 1; x < array.length() + 1; x++) {

tmp = x; array[x-1] = MathFcn.pow(tmp, 1/tmp); }
