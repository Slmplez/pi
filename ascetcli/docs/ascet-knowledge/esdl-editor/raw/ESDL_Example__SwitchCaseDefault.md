# Example: Switch...Case...Default

The example below sets the value of a variable scont depending on the value of the limitIntArg.

switch(limitIntArg) {

case 1 : {

scont = 1.123;

break; }

case -1: {

scont = 0;

break; }

default: {

scont = -1;

break; }

}

In this example, every block is terminated with a break statement.

If the case blocks were not terminated explicitly, execution would continue after a match has been found. This means that for limitIntArg=-1 the value of scont would first be set to 0 by the corresponding block and then set to -1 by the default block if the break statement was missing.
