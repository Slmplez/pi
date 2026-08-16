# Example: To Build the Integrator Element

- In the Component Manager, create a new ESDL module and rename it to IntegratorLimit.
- Open an ESDL Editor for IntegratorLimit.
- Add a continuous variable named mem. The integrator’s memory stores the value of the outgoing signal.
- Add the limiter module from the following folder: Systemlib_ETAS\Nonlinears\Limiter.
- Add the methods out, reset and compute.

You can either rename the default method calc to compute or delete it.

- Use the Interface Editor to edit the corresponding method interfaces as follows:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Method | Arguments | Returns |
| compute | cont mx cont in cont mn | void |
| out | out | cont |
| reset | cont initVal | void |

- Enter the ESDL code for each method and save the method. The ESDL code for each method is listed below.

reset (initVal) mem = initVal;

cont out () return mem;

compute (mn, in, mx) mem = mem + K * in * dT;\ mem = Limiter.out (mn, mem, mx);
