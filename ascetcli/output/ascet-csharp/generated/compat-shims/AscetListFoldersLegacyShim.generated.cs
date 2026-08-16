using System;

public static class AscetListFoldersLegacyShim
{
    [STAThread]
    public static int Main(string[] args)
    {
        return LegacyShimGenerator.Run(
            new LegacyShimDefinition
            {
                ProgramTypeName = "AscetListFoldersLegacyShim",
                OutputFileName = "AscetListFolders.exe",
                Subcommand = "exec",
                Operation = "list_folders",
                TranslationMode = LegacyShimTranslationMode.PromoteLeadingPositionalToOption,
                PromotedOptionName = "--root"
            },
            args);
    }
}
