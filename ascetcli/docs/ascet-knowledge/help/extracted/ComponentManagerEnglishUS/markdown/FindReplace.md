# Find and Replace in C Code and ESDL Components

From within the Component Manager, you can search all C code and ESDL components for a character string. You can replace either an individual occurrence of the character string, every occurrence in a component or every occurrence in the entire database or workspace.

This function makes it easier to work with messages (or other global elements). These are linked via their names (see [Interprocess Communication](ProjectEditorEnglishUS.chm::/pe_interprocess_communication.htm)), if one name is changed, all occurrences have to be changed. The search throughout the entire database/workspace means time-consuming manual searches are a thing of the past.

The search does not distinguish between upper and lower case. If, for example, you enter cont, Cont and CONT are found, too. The character string is also found if it is part of a longer word, for example, searching for cont also finds all occurrences of Continuous.

See also

[Finding a Character String](CharacterString.md)

[Viewing the Search Results](SearchResults.md)

[Opening the Component from the Search Window](OpenComponent.md)

[Replacing Selected Character Strings](ReplaceString.md)

[Replacing All Character Strings in One Component](ReplaceCharacter.md)

[Replacing All Character Strings in the Database/Workspace](ReplaceStringsinComponent.md)

[Interprocess Communication](ProjectEditorEnglishUS.chm::/pe_interprocess_communication.htm)
