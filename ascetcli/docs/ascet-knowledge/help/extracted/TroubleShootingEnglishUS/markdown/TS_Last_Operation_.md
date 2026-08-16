# Return Must Be the Last Operation

last operation of <name> must be return statement

##### Description:

A method with a return value or condition name has a return statement whose sequence call does not have the highest sequence number in sequence calls attached to the method or condition.

##### Solution:

Change the sequence number in the sequence call to the highest number in all sequence calls belonging to the method or condition name.
