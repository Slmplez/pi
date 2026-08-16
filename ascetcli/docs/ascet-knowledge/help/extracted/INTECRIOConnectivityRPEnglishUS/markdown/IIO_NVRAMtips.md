# NVRAM: Tips

The following tips are useful for working with NVRAM.

##### State variable as non-volatile:

The enhanced NVRAM support includes the possibility to assign the non-volatile attribute to the sm state variable of a state machine. To do so, right-click on the sm variable in the Outline tab of the state machine editor to open the context menu, then open the Settings submenu and select Non-Volatile.

##### Actual size of multi-dimensional elements:

The actual size ("current size" attribute) of multi-dimensional elements (array, matrix, characteristic line/map) is saved in the NVRAM.

Changes of the actual size in the model (offline) become valid in the downloaded program only after the NVRAM content is deleted (e.g. via the NVRAM cockpit, or if the NVRAM content is inconsistent with the program.

##### Flash project with NVRAM:

Bear in mind that the program in the Flash memory is launched each time the ES1000 or ES900 or RTPRO-PC is started. If this project uses NV variables, it uses the NVRAM. A subsequent download of any other program containing NV variables leads to an (unexpected) reset of the NVRAM content.

See also

[NVRAM Safety Information](IIO_NVRAMSafetyInformation.md)

[Non-Volatile RAM](IIO_NonvolatileRAM.md)

[API Functions - NVRAM](IIO_APIfunctionsNVRAM.md)
