# Frequently Asked Questions

| Column 1 | Column 2 |
| --- | --- |
| Q | I want to use ASCET-SCM "on the road" - in a mobile use case. How do I proceed? |
| A | See Online versus Offline Mode and Editing Items in Offline Mode . |
|  |  |
| Q | I have to import an item by using File , Import but a different version of this item is already contained in the Subversion repository. How do I handle this item in ASCET-SCM? |
| A | See: Special Use Case: Handling Imported Components . |
|  |  |
| Q | Is checking out in ASCET-SCM the same as checking out in TortoiseSVN? |
| A | No; unlike TortoiseSVN, the Checkout command in ASCET-SCM does not automatically read a complete repository to a new folder, but shows the complete repository content in the Checkout Dialog Box. See also: Checking out in ASCET-SCM versus Checking out in TortoiseSVN . |
|  |  |
| Q | I want to add new configurations to version control. Should I simply add the entire folder in which these configurations are contained? |
| A | You are recommended to use Add and Commit New Configuration for an individual configuration (see Creating a Configuration ) but not for a folder. If you apply this command at a folder level, each item within this folder will receive its own configuration. See also: Managing ASCET Folders . |
|  |  |
| Q | What happens when I unlock an item or configuration? |
| A | Once you have unlocked an item or configuration, it is available for locking by other users and your local modifications may be thus be undone. That's why ASCET-SCM will issue a warning message when you unlock locally modified items or configurations. To preserve your modifications under version control, select Commit or Commit Configuration . See also: Locking and Unlocking . |
|  |  |
| Q | I want to edit an item in ASCET and save it as a new version, even though the SCM repository contains a newer item version (which is "skipped"). How do I proceed? |
| A | Proceed as follows: Use Checkout or Update to load the item version you want to edit. Use Edit without Lock to edit the selected item version in offline mode. Use Commit New Revision without Lock to preserve your modifications under version control. Answer the warning message "... More recent versions exist in repository ... Do you want to continue?" with Yes . |
|  |  |

See also

[Version Handling Based on Subversion](SCM_Version_Handling_based_on_Subversion.md)
