# Statements

Graphical specifications of software components can be hierarchically distributed over several diagrams. In a diagram, one or more runnables or methods can be described which can be executed independently of each other. The order in which calculations are executed, as well as the particular runnable or method a calculation belongs to is determined by sequence calls.

For each statement of an SWC, there is a sequence call that assigns it to a runnable or method. The order within a particular runnable is determined by the sequence number that is part of the sequence call. Sequence calls are represented graphically as follows:

![](sequencecall.gif) (10, 15, 20 being the sequence numbers)

With the sequence numbers, the order of the operations belonging to one runnable or method can be determined by the user. A built-in sequencing algorithm can be used to assign sequence numbers that correspond to the evaluation order of standard block diagrams.

A sequence call generally consists of three fields:

- The name of the method called.
- The sequence number determining the position of the called method in the calling method or process.

- The name of the method or process calling.

In the case of scalar elements, the name of the method called is left blank as this is always the assignment of a new value.

There are three kinds of statements:

- Assignment statements
- Method calls
- [Control Flow Statements](ASCcontrolFlowOperators.md), e.g. if…then…else, while

See also

[Sequence Calls](ascsequencecalls.md)

[Control Flow Operators](ASCcontrolFlowOperators.md)

[Method Call and Assignment](ascassignment.md)
