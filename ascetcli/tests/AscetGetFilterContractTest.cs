using System;
using System.Collections.Generic;

public static class AscetGetFilterContractTest
{
    public static int Main()
    {
        try
        {
            AscetGetRequest unfiltered = new AscetGetRequest();
            AssertTrue(AscetGetService.MatchesComponentReference("CM_SCM", "exported", unfiltered), "unfiltered reference");

            AscetGetRequest byName = new AscetGetRequest();
            byName.NameFilter = "CM_SCM";
            AssertTrue(AscetGetService.MatchesComponentReference("CM_SCM", "exported", byName), "matching name");
            AssertTrue(!AscetGetService.MatchesComponentReference("CM_OTHER", "exported", byName), "non-matching name");

            AscetGetRequest byScope = new AscetGetRequest();
            byScope.Scopes = new List<string> { "exported" };
            AssertTrue(AscetGetService.MatchesComponentReference("CM_SCM", "EXPORTED", byScope), "matching scope is case-insensitive");
            AssertTrue(!AscetGetService.MatchesComponentReference("CM_SCM", "imported", byScope), "non-matching scope");

            AscetGetRequest combined = new AscetGetRequest();
            combined.NameFilter = "CM_SCM";
            combined.Scopes = new List<string> { "exported" };
            AssertTrue(AscetGetService.MatchesComponentReference("CM_SCM", "exported", combined), "combined filters match");
            AssertTrue(!AscetGetService.MatchesComponentReference("CM_SCM", "imported", combined), "combined scope rejection");
            AssertTrue(!AscetGetService.MatchesComponentReference("CM_OTHER", "exported", combined), "combined name rejection");

            Console.WriteLine("AscetGetFilterContractTest passed");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.ToString());
            return 1;
        }
    }

    private static void AssertTrue(bool condition, string label)
    {
        if (!condition) throw new InvalidOperationException("Assertion failed: " + label);
    }
}
