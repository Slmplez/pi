# Complex Types as Signature Elements

You can use [composite elements](IntroductionEnglishUS.chm::/INT_composite_summaryct.htm) and classes as method signature elements. The usage is explained with the help of examples.

In offline experiments, methods with composite arguments, i.e. array, matrix or component arguments, do not appear in the [event generator](ExperimentationEnglishUS.chm::/event_generator.htm). No event can be created for them, and they cannot be accessed during the offline experiment.

##### Arrays, Matrices and Classes as Signature Elements

When using a composite or user-defined signature element (array, matrix, class), you can access it via the normal element pins. In addition, you can use the Get and Set ports to access the entire data structure. A matrix is used as an example to describe the procedure; see [Using a Matrix Argument (Example)](BDE_UseMatrixArgument_Example.md).

##### Characteristic Lines and Maps as Arguments

You cannot directly pass a characteristic line or map as argument. To do so, you have to include the characteristic line/map in a class, and use the class as an argument. The procedure is described for a characteristic line; see [Characteristic Line as Argument (Example)](BDE_CharacteristicLineArgument_Example.md).

See also

[Using a Matrix Argument (Example)](BDE_UseMatrixArgument_Example.md)

[Characteristic Line as Argument (Example)](BDE_CharacteristicLineArgument_Example.md)

[Composite Types - Summary](IntroductionEnglishUS.chm::/INT_composite_summaryct.htm)
