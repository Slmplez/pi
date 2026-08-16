# Switching to Quantized Floating Point Arithmetic

To switch to quantized floating point arithmetic, proceed as follows:

1. Click on the ![](buttonProjectProperties.gif) Project Properties button.
1. In the [Build](Build_Options.md) node, Code Generator option, select Quantized Physical Experiment.
1. Click OK.

The next time you start the experiment, your code is generated with the current settings.

Experimenting with models with quantized floating point arithmetic works in the same way as with standard floating point arithmetic. The difference is that for experimentation with quantized floating point arithmetic, there is a special calibration window to adjust the limits of the interval and the quantization of the value.

See also

[Build Node](Build_Options.md)

[Opening the Quantized Calibration Window](open_quantized.md)

[Working with the Quantized Calibration Window](work_quantized.md)
