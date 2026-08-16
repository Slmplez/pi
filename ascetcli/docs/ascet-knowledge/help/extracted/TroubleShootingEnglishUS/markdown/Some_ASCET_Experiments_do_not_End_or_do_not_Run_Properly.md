# Experiments Do Not Run

Some ASCET experiments do not end or not run properly

Here the problem often lies with the C code that has been integrated into an ASCET model. Potential errors are wrong passing of parameters (when converting the ASCET type continuous the C type double float should be chosen), and infinite loops in the C code. Infinite loops may also occur in recursive object structures. A possible way to find the error here, is to exclude the C code components.

The generated code may not run in the scheduled time frame, i.e. its execution time is too long. Here either the specification must be changed, or a time frame with a longer interval should be assigned.

Another source of errors in this field is that sequence calls are not set properly or are simply forgotten.
