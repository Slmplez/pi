# Customizing Menus and Icons - Examples

This topic contains some examples for menu and toolbar configuration:

1. [Example 1: Editing a <Command ... /> entry](#Example1)
1. [Example 2: Adding a command to the SCM menu](#Example2)
1. [Example 3: Shifting menu items to a submenu](#Example3)
1. [Example 4: Adding a command to the SCM toolbar](#Example4)

##### Example 1: Editing a <Command ... /> entry

The following <Command .../> entry is required to rename the Get Lock command to Get Lock for Item and replace the default icon with the [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)green-upper-L.ico file](javascript:void(0);) in the C:\ETAS\ASCET6.2\SCM\common_icons folder.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_1.gif)

<Command internalID="11" id="Lock" label="Get Lock for Item" iconID="..\..\..\common_icons\green-upper-L" considerItemSelection="true" validItemVersionStates="revision,modified,no_scm" willOpenDialog="true" considerItemReferences="false" relevantForConfigurationManagement="false" singleItemSelectionOnly="false"/>

With that definition, the entries in the [SCM menu](SCM_ASCET-SCM_Menu.md) and the [SCM toolbar](SCM_Toolbar_Icons.md) look as follows:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_2.gif)

[Back to top](#)

##### Example 2: Adding a command to the SCM menu

The Checkout and Lock Configuration command is defined in the following <Command .../> entry:

<Command internalID="35" id="CheckoutAndLockConfiguration" label="Checkout and Lock Configuration" iconID="menu_checkout_and_lock_config" considerItemSelection="true" validItemVersionStates="configuration.revision" willOpenDialog="true" considerItemReferences="false" relevantForConfigurationManagement="false" singleItemSelectionOnly="false"/>

The following code adds the standard definition of the Checkout and Lock Configuration command to the Configuration Management submenu of the [SCM menu (online mode)](SCM_ASCET-SCM_Menu.md):

<MenuDefinitions>

<ASCETMenuBar>

...

<MenuItem label="Configuration Management">

...

<MenuItem id="CheckoutAndLockConfiguration"/>

...

</MenuItem>

...

</ASCETMenuBar>

...

</MenuDefinitions>

With that, the Configuration Management submenu of the [SCM menu](SCM_ASCET-SCM_Menu.md) can look as follows:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_3.gif)

[Back to top](#)

##### Example 3: Shifting menu items to a submenu

The [Source Control](SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) context menu (online mode) contains, by default, the same Configuration Management submenu as the [SCM](SCM_ASCET-SCM_Menu.md) menu (online mode). The following code is required to place the last four commands of that submenu in a lower-level submenu named Advanced.

<MenuDefinitions>

...

<ASCETContextMenu>

...

<MenuItem label="Configuration Management">

...

<MenuItem label="Advanced"/>

<MenuItem id="ShowConfigurationLog"/>

<MenuItem id="ConfigurationProperties"/>

<MenuItem id="CompareConfiguration"/>

<MenuItem id="VerifyConfiguration"/>

</MenuItem>

</MenuItem>

...

</ASCETContextMenu>

</MenuDefinitions>

With that, the Configuration Management submenu of the [Source Control](SCM_ASCET-SCM_Menu.md#SourceControl_ContextMenu) context menu looks as follows:

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_4.gif)

[Back to top](#)

##### Example 4: Adding a command to the SCM toolbar

The default definition of the Edit Without Lock command (used to [edit items in offline mode](SCM_Editing_Items_in_Offline_Mode.md)) looks as follows:

<Command internalID="16" id="EditWithoutLock" label="Edit Without Lock" iconID="menu_commit_without_lock" considerItemSelection="true" invalidItemVersionStates="no_scm,lockedrevision,localedition,modified" validItemVersionStates="" willOpenDialog="true" considerItemReferences="false" relevantForConfigurationManagement="false" singleItemSelectionOnly="false"/>

The following code adds the Edit Without Lock command to the [SCM toolbar](SCM_Toolbar_Icons.md):

<MenuDefinitions>

...

<ASCETToolBar>

...

<MenuItem id="EditWithoutLock"/>

...

</ASCETToolBar>

...

</MenuDefinitions>

With that, the [SCM toolbar](SCM_Toolbar_Icons.md) can look as follows.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/example_menuconf_6.gif)

[Back to top](#)

See also

[SCM Menu (with Version Management)](SCM_ASCET-SCM_Menu.md)

[Toolbar Icons](SCM_Toolbar_Icons.md)
