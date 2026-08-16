# Using Staged Build Settings

To work with staged build, proceed as follows.

1. Go to the target directory of the target you are using (e.g., ...\target\PC for an offline experiment).
1. Open the global_settings.mk file in a text editor.
1. Set ASD_PAUSE_MODE to TRUE and save the file.
1. In ASCET, start the Build process.

At each breakpoint, the ASCET_PAUSE_MODE message window opens. It names the completed build stage.

1. Confirm the message with OK to continue the build process.

The build process continues until the next breakpoint.

Or

1. In the ASCET monitor window, click on Cancel to stop the build process.

See also

[Staged Build Settings](OH_Staged_Build_Settings.md)
