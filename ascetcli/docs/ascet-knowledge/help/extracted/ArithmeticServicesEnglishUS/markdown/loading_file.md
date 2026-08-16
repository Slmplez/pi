# Loading a File

To load a file in the AS editor, proceed as follows:

1. Do one of the following:
1. Select the file you want to open.
1. Do one of the following:

- Click Open to load the file.
- Click Cancel to cancel the procedure.

You can open one of the four last opened files directly from the File menu.

When you open a file, the program loads the contents of the file. If, during this process, the program detects errors in entries, it generates messages accordingly and lists the results in the Parsing Summary window after it has finished loading the file.

Entries with errors are converted automatically to comment lines and provided with a description of the error. Such entries as easy to find in the Entries field, as they are indicated with a red or yellow LED symbol.

When loading a file, the program ignores all entries that are located above the first set definition (i.e. above the first left square bracket [). Likewise, all empty lines are ignored and are not loaded.

After all entries have been loaded, those entries belonging to the first set found in the file are listed in the Entries field.

See also

[Saving a File](saving_file.md)
