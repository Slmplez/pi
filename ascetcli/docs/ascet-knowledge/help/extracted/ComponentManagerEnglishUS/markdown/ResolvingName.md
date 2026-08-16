# Resolving Name Conflicts

In some cases, where item names in an existing version 2.x database are distinguished only by punctuation marks or spaces, the default mapping for conversion to ANSI C can lead to naming conflicts.

For example, the item names Integrator I21 and Integrator-I21 both map to Integrator_I21. Since item names must be unique, the conversion algorithm would assign Integrator_211 to the second item.

You can either accept this solution to naming conflicts when converting to ANSI C or edit the corresponding map file. The mapping.ini file is located in the ASCET directory and can be edited using any standard text editor.

You cannot modify the mapping for spaces, they are always converted to underscores.
