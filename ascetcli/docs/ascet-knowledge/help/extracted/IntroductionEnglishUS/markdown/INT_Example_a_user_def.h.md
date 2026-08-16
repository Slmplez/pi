# Example: a_user_def.h

#ifndef __A_USER_DEF_H

#define __A_USER_DEF_H

/******************************************************************************

** FILE: A_USER_DEF.H

**

** DESCRIPTION: This header file is intended for customization purpose.

** customer can insert here some definitions or includes to other

** header files. These definitions will be known to all generated

** source files of an ASCET project. For example, if "user defined

** data types" are used, the definition of such types should be

** performed here:

**

** typedef unsigned char myBool;

**

** Type myBool will be visible for all generated sources and

** can be used there to define boolean variables.

*******************************************************************************/

/******************************************************************************

** ADD YOUR DECLARATIONS OR DEFINITIONS HERE.

*******************************************************************************/

typedef signed char mySint8; /* -128 .. +127 */

typedef unsigned char myUint8; /* 0 .. 255 */

typedef signed short mySint16; /* -32768 .. +32767 */

typedef unsigned short myUint16; /* 0 .. 65535 */

typedef signed long mySint32; /* -2147483648 .. +2147483647 */

typedef unsigned long myUint32; /* 0 .. 4294967295 */

#endif /* __A_USER_DEF_H */
