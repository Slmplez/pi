using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public static class AscetDatabaseExplorerCommon
{

    public static string NormalizePath(string value, string argumentName)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", argumentName, argumentName + " must not be empty.");
        }

        string normalized = value.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", argumentName, argumentName + " must not be empty.");
        }

        return normalized;
    }

    public static string NormalizeFolderPath(string value)
    {
        string normalized = NormalizePath(value, "folder_path");
        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        return normalized;
    }

    public static string NormalizeQuery(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "query", "query must not be empty.");
        }

        return value.Trim();
    }

    public static int ParsePositiveInt(string value, string argumentName, int fallback)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        int parsed;
        if (!Int32.TryParse(value, out parsed) || parsed < 1)
        {
            throw new AscetReadException("invalid_argument", argumentName, argumentName + " must be a positive integer.");
        }

        return parsed;
    }

    public static AscetComponentKind ParseKind(string raw)
    {
        if (String.IsNullOrWhiteSpace(raw))
        {
            return AscetComponentKind.Unknown;
        }

        string normalized = raw.Trim().ToLowerInvariant();
        if (normalized == "all")
        {
            return AscetComponentKind.Unknown;
        }

        if (normalized == "class")
        {
            return AscetComponentKind.Class;
        }

        if (normalized == "module")
        {
            return AscetComponentKind.Module;
        }

        if (normalized == "statemachine" || normalized == "state-machine" || normalized == "state_machine")
        {
            return AscetComponentKind.StateMachine;
        }

        if (normalized == "project")
        {
            return AscetComponentKind.Project;
        }

        if (normalized == "continuoustimeblock" || normalized == "continuous-time-block" || normalized == "continuous_time_block")
        {
            return AscetComponentKind.ContinuousTimeBlock;
        }

        if (normalized == "enumeration")
        {
            return AscetComponentKind.Enumeration;
        }

        if (normalized == "record")
        {
            return AscetComponentKind.Record;
        }

        if (normalized == "icon")
        {
            return AscetComponentKind.Icon;
        }

        if (normalized == "signal")
        {
            return AscetComponentKind.Signal;
        }

        if (normalized == "container")
        {
            return AscetComponentKind.Container;
        }

        if (normalized == "folder")
        {
            return AscetComponentKind.Folder;
        }

        throw new AscetReadException("invalid_argument", "kind", "Unsupported kind '" + raw + "'. Expected all, class, module, statemachine, project, continuous-time-block, enumeration, record, icon, signal, container, or folder.");
    }

    public static IList<AscetItemRef> FilterItems(IList<AscetItemRef> items, AscetComponentKind kind, string query, int limit)
    {
        List<AscetItemRef> result = new List<AscetItemRef>();
        if (items == null)
        {
            return result;
        }

        string normalizedQuery = String.IsNullOrWhiteSpace(query) ? String.Empty : query.Trim();
        string lowerQuery = normalizedQuery.ToLowerInvariant();
        bool useGlob = ContainsGlobWildcard(normalizedQuery);
        for (int i = 0; i < items.Count; i++)
        {
            AscetItemRef item = items[i];
            if (!ItemMatchesFilter(item, kind, normalizedQuery, lowerQuery, useGlob))
            {
                continue;
            }

            result.Add(item);
            if (limit > 0 && result.Count >= limit)
            {
                break;
            }
        }

        return result;
    }

    public static bool ItemMatchesFilter(AscetItemRef item, AscetComponentKind kind, string query)
    {
        string normalizedQuery = String.IsNullOrWhiteSpace(query) ? String.Empty : query.Trim();
        return ItemMatchesFilter(
            item,
            kind,
            normalizedQuery,
            normalizedQuery.ToLowerInvariant(),
            ContainsGlobWildcard(normalizedQuery));
    }

    public static bool ItemMatchesFilter(
        AscetItemRef item,
        AscetComponentKind kind,
        string normalizedQuery,
        string lowerQuery,
        bool useGlob)
    {
        if (item == null)
        {
            return false;
        }

        if (kind != AscetComponentKind.Unknown && item.Kind != kind)
        {
            return false;
        }

        if (String.IsNullOrEmpty(normalizedQuery))
        {
            return true;
        }

        string name = item.Name ?? String.Empty;
        string path = item.Path ?? String.Empty;
        string normalizedPath = path.Replace('\\', '/');
        string normalizedGlob = normalizedQuery.Replace('\\', '/');
        string haystack = (name + "\n" + path).ToLowerInvariant();
        if (useGlob)
        {
            return GlobMatches(name, normalizedQuery)
                || GlobMatches(path, normalizedQuery)
                || GlobMatches(normalizedPath, normalizedGlob);
        }

        return haystack.IndexOf(lowerQuery, StringComparison.Ordinal) >= 0;
    }

    private static bool ContainsGlobWildcard(string value)
    {
        return !String.IsNullOrEmpty(value)
            && (value.IndexOf('*') >= 0 || value.IndexOf('?') >= 0);
    }

    private static bool GlobMatches(string value, string pattern)
    {
        return GlobMatches(value ?? String.Empty, pattern ?? String.Empty, 0, 0);
    }

    private static bool GlobMatches(string value, string pattern, int valueIndex, int patternIndex)
    {
        while (patternIndex < pattern.Length)
        {
            char token = pattern[patternIndex];
            if (token == '*')
            {
                while (patternIndex + 1 < pattern.Length && pattern[patternIndex + 1] == '*')
                {
                    patternIndex++;
                }

                if (patternIndex + 1 >= pattern.Length)
                {
                    return true;
                }

                for (int i = valueIndex; i <= value.Length; i++)
                {
                    if (GlobMatches(value, pattern, i, patternIndex + 1))
                    {
                        return true;
                    }
                }

                return false;
            }

            if (valueIndex >= value.Length)
            {
                return false;
            }

            if (token != '?' && Char.ToUpperInvariant(token) != Char.ToUpperInvariant(value[valueIndex]))
            {
                return false;
            }

            valueIndex++;
            patternIndex++;
        }

        return valueIndex == value.Length;
    }

    public static Dictionary<string, object> BuildSerializableItem(AscetItemRef item)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["name"] = item == null ? String.Empty : (item.Name ?? String.Empty);
        payload["path"] = item == null ? String.Empty : (item.Path ?? String.Empty);
        payload["kind"] = item == null ? KindToSchema(AscetComponentKind.Unknown) : KindToSchema(item.Kind);
        payload["languageKind"] = item == null ? AscetLanguageKind.Unknown.ToString() : item.LanguageKind.ToString();
        return payload;
    }

    public static string KindToFilterSchema(AscetComponentKind kind)
    {
        if (kind == AscetComponentKind.Unknown)
        {
            return "all";
        }

        return KindToSchema(kind);
    }

    public static string KindToOutputSchema(AscetComponentKind kind)
    {
        return KindToSchema(kind);
    }

    public static string KindToSchema(AscetComponentKind kind)
    {
        switch (kind)
        {
            case AscetComponentKind.Class:
                return "class";
            case AscetComponentKind.Module:
                return "module";
            case AscetComponentKind.StateMachine:
                return "stateMachine";
            case AscetComponentKind.Project:
                return "project";
            case AscetComponentKind.ContinuousTimeBlock:
                return "continuousTimeBlock";
            case AscetComponentKind.Enumeration:
                return "enumeration";
            case AscetComponentKind.Record:
                return "record";
            case AscetComponentKind.Icon:
                return "icon";
            case AscetComponentKind.Signal:
                return "signal";
            case AscetComponentKind.Container:
                return "container";
            case AscetComponentKind.Folder:
                return "folder";
            default:
                return "unknown";
        }
    }

    public static int GetCount(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return 0;
        }

        object value = payload[key];
        if (value is int)
        {
            return (int)value;
        }

        if (value is long)
        {
            return (int)(long)value;
        }

        if (value is double)
        {
            return (int)(double)value;
        }

        int parsed;
        if (Int32.TryParse(value.ToString(), out parsed))
        {
            return parsed;
        }

        return 0;
    }

    public static Dictionary<string, object> NewChildItem(string group, string name, string kind)
    {
        Dictionary<string, object> item = new Dictionary<string, object>();
        item["group"] = group ?? String.Empty;
        item["name"] = name ?? String.Empty;
        item["kind"] = kind ?? String.Empty;
        return item;
    }

    public static Dictionary<string, object> DeserializeJsonObject(string json)
    {
        return AscetJsonContract.DeserializeObject(json ?? String.Empty);
    }

    public static Dictionary<string, object> DeserializeChildJsonObject(string json)
    {
        Dictionary<string, object> payload = DeserializeJsonObject(json);
        if (payload == null)
        {
            return new Dictionary<string, object>();
        }

        if (!payload.ContainsKey("ok"))
        {
            return payload;
        }

        bool ok = true;
        if (payload["ok"] is bool)
        {
            ok = (bool)payload["ok"];
        }
        else if (!Boolean.TryParse(Convert.ToString(payload["ok"]), out ok))
        {
            ok = true;
        }

        if (ok)
        {
            Dictionary<string, object> result = payload["result"] as Dictionary<string, object>;
            if (result != null)
            {
                return result;
            }

            if (!payload.ContainsKey("result") || payload["result"] == null)
            {
                return new Dictionary<string, object>();
            }

            throw new AscetReadException(
                "invalid_envelope",
                "deserialize_child_json",
                "Child command returned a success envelope without an object result payload.");
        }

        Dictionary<string, object> error = payload["error"] as Dictionary<string, object>;
        Dictionary<string, object> meta = payload["meta"] as Dictionary<string, object>;
        throw new AscetReadException(
            FirstNonEmpty(GetString(error, "code"), "child_command_failed"),
            FirstNonEmpty(GetString(meta, "operation"), "deserialize_child_json"),
            FirstNonEmpty(GetString(error, "message"), "Child command returned an error envelope."));
    }

    public static IList<Dictionary<string, object>> FlattenImplementationElements(object rawElements)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        FlattenImplementationElementsInto(rawElements, result);
        return result;
    }

    public static string GuessElementGroup(Dictionary<string, object> element)
    {
        string displayKind = GetString(element, "DisplayKind");
        string elementKind = GetString(element, "ElementKind");
        string probe = (displayKind + " " + elementKind).ToLowerInvariant();

        if (probe.IndexOf("method", StringComparison.Ordinal) >= 0)
        {
            return "methods";
        }

        if (probe.IndexOf("array", StringComparison.Ordinal) >= 0)
        {
            return "arrays";
        }

        if (probe.IndexOf("component", StringComparison.Ordinal) >= 0)
        {
            return "components";
        }

        if (probe.IndexOf("variable", StringComparison.Ordinal) >= 0 || probe.IndexOf("state", StringComparison.Ordinal) >= 0)
        {
            return "variables";
        }

        return "parameters";
    }

    public static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return payload[key].ToString();
    }

    public static IList<object> GetList(IDictionary<string, object> payload, string key)
    {
        List<object> result = new List<object>();
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return result;
        }

        return ToObjectList(payload[key]);
    }

    public static string Serialize(object value)
    {
        return AscetJsonContract.Serialize(value);
    }

    public static string FirstNonEmpty(params string[] values)
    {
        if (values == null)
        {
            return String.Empty;
        }

        for (int i = 0; i < values.Length; i++)
        {
            if (!String.IsNullOrWhiteSpace(values[i]))
            {
                return values[i];
            }
        }

        return String.Empty;
    }

    private static void FlattenImplementationElementsInto(object rawElements, IList<Dictionary<string, object>> target)
    {
        IList<object> values = ToObjectList(rawElements);
        for (int i = 0; i < values.Count; i++)
        {
            Dictionary<string, object> element = values[i] as Dictionary<string, object>;
            if (element == null)
            {
                continue;
            }

            target.Add(element);
            if (element.ContainsKey("ChildElements"))
            {
                FlattenImplementationElementsInto(element["ChildElements"], target);
            }
        }
    }

    private static IList<object> ToObjectList(object value)
    {
        List<object> result = new List<object>();
        if (value == null)
        {
            return result;
        }

        object[] objectArray = value as object[];
        if (objectArray != null)
        {
            for (int i = 0; i < objectArray.Length; i++)
            {
                result.Add(objectArray[i]);
            }

            return result;
        }

        ArrayList arrayList = value as ArrayList;
        if (arrayList != null)
        {
            for (int i = 0; i < arrayList.Count; i++)
            {
                result.Add(arrayList[i]);
            }

            return result;
        }

        IEnumerable enumerable = value as IEnumerable;
        if (enumerable != null && !(value is string))
        {
            foreach (object item in enumerable)
            {
                result.Add(item);
            }
        }

        return result;
    }

}
