# Unpredictable Effects

Unpredictable effects when using complex assignments

Unpredictable effects with the measuring of complex elements occur when complex assignments are executed in the model. A complex assignment is represented by an assignment of the respective pointers of the complex elements, that is, both objects are identical afterwards and one object is lost. E.g. in the assignment A=B, the element A becomes the element B. The measurement and calibration system however still refers to both as separate objects. You can measure and calibrate the ’lost’ object (here object A) but this has no effect and does not take into account the object that represents the complex element after the assignments (i.e. object B).
