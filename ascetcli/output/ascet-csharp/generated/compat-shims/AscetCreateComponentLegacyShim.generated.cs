using System;

public static class AscetCreateComponentLegacyShim
{
    [STAThread]
    public static int Main(string[] args)
    {
        return LegacyShimGenerator.Run(
            new LegacyShimDefinition
            {
                ProgramTypeName = "AscetCreateComponentLegacyShim",
                OutputFileName = "AscetCreateComponent.exe",
                Subcommand = "exec",
                Operation = "create_component",
                TranslationMode = LegacyShimTranslationMode.None,
                PromotedOptionName = null
            },
            args);
    }
}
