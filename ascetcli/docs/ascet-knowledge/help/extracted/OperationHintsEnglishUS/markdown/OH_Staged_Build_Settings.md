# Staged Build Settings

The ASCET build process consists of several steps. Normally, these steps are executed one after the other, without breaks. If necessary, you can interrupt the build process on several pre-defined points.

For this purpose, the global_settings.mk file (available in the target directory of each target installed on your PC) contains the variable ASD_PAUSE_MODE.

#############################################################################

## only for debug purpose of make process; this variable can be set to TRUE,

## to cause gmake to make a pause after each relevant build stage.

#############################################################################

ASD_PAUSE_MODE=TRUE

If this switch is set to TRUE, the build process pauses at pre-defined points.

See also

[Using Staged Build Settings](OH_Use_Staged_Build.md)
