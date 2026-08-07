using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;

public static class Program
{
    private const string AscetAssemblyRelativePath = @"Ascetapidll\Etas.AscetNET.dll";
    private static string _resolvedAssemblyPath;

    public static int Main()
    {
        try
        {
            ConfigureAssemblyResolution();
            string output = Run();
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    public static string FormatOutput(string databaseName, IEnumerable<string> folderNames)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Database: ").Append(databaseName).AppendLine();
        builder.Append("============================================================").AppendLine();
        builder.AppendLine();
        builder.Append("=== Top level folders ===").AppendLine();

        foreach (string folderName in folderNames)
        {
            builder.Append("Folder: ").Append(folderName).AppendLine();
        }

        return builder.ToString();
    }

    private static string FormatException(Exception ex)
    {
        StringBuilder builder = new StringBuilder();
        int depth = 0;

        while (ex != null)
        {
            builder.Append("Exception[").Append(depth).Append("]: ")
                .Append(ex.GetType().FullName).AppendLine();
            builder.Append("Message: ").Append(ex.Message).AppendLine();

            if (!String.IsNullOrEmpty(ex.StackTrace))
            {
                builder.AppendLine("StackTrace:");
                builder.AppendLine(ex.StackTrace);
            }

            builder.AppendLine();
            ex = ex.InnerException;
            depth++;
        }

        return builder.ToString();
    }

    private static string Run()
    {
        ResolveAssemblyPath();

        Ascet tool = null;

        try
        {
            tool = new Ascet();

            AscetDataBase database = tool.GetCurrentDataBase();
            if (database == null)
            {
                throw new InvalidOperationException("GetCurrentDataBase returned null. Open a database in ASCET first.");
            }

            string databaseName = database.GetName();
            AscetFolder[] folders = database.GetAllAscetFolders();
            List<string> folderNames = new List<string>();

            if (folders != null)
            {
                foreach (AscetFolder folder in folders)
                {
                    if (folder != null)
                    {
                        folderNames.Add(folder.GetName());
                    }
                }
            }

            return FormatOutput(databaseName, folderNames);
        }
        finally
        {
            if (tool != null)
            {
                tool.DisconnectFromTool();
            }
        }
    }

    private static string ResolveAssemblyPath()
    {
        if (!String.IsNullOrEmpty(_resolvedAssemblyPath))
        {
            return _resolvedAssemblyPath;
        }

        _resolvedAssemblyPath = AscetToolApiBootstrap.ResolveAssemblyPath();
        return _resolvedAssemblyPath;
    }
    private static void ConfigureAssemblyResolution()
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();
    }
}
