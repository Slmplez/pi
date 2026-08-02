using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

public static class AscetTestContracts
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    public static Dictionary<string, object> ReadRequest(string path, bool executeLive)
    {
        Dictionary<string, object> request = ReadObject(path, "request");

        if (executeLive)
        {
            request["executeLive"] = true;
        }

        return request;
    }

    public static Dictionary<string, object> ReadObject(string path, string kind)
    {
        if (!File.Exists(path))
        {
            throw new AscetTestCliException("request_missing", (kind ?? "JSON") + " file was not found: " + path);
        }

        string json = File.ReadAllText(path, Encoding.UTF8);
        object parsed;
        try
        {
            parsed = Serializer.DeserializeObject(json);
        }
        catch (Exception ex)
        {
            throw new AscetTestCliException("request_invalid_json", (kind ?? "JSON") + " JSON could not be parsed: " + ex.Message);
        }

        Dictionary<string, object> result = parsed as Dictionary<string, object>;
        if (result == null)
        {
            throw new AscetTestCliException("request_invalid_shape", (kind ?? "JSON") + " JSON root must be an object.");
        }

        return result;
    }

    public static void WriteJson(string path, Dictionary<string, object> envelope)
    {
        string directory = Path.GetDirectoryName(Path.GetFullPath(path));
        if (!String.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        string json = Serializer.Serialize(envelope ?? new Dictionary<string, object>());
        File.WriteAllText(path, json + Environment.NewLine, new UTF8Encoding(false));
    }

    public static string Serialize(Dictionary<string, object> envelope)
    {
        return Serializer.Serialize(envelope ?? new Dictionary<string, object>());
    }

    public static string SerializeList(IList values)
    {
        return Serializer.Serialize(values ?? new List<object>());
    }

    public static object Deserialize(string json)
    {
        return Serializer.DeserializeObject(json ?? String.Empty);
    }

    public static object GetValue(IDictionary<string, object> source, string key)
    {
        object value;
        return source != null && source.TryGetValue(key, out value) ? value : null;
    }

    public static Dictionary<string, object> GetDictionary(IDictionary<string, object> source, string key)
    {
        return GetValue(source, key) as Dictionary<string, object>;
    }

    public static IList<object> GetList(IDictionary<string, object> source, string key)
    {
        return GetValue(source, key) as IList<object>;
    }

    public static bool GetBoolean(IDictionary<string, object> source, string key, bool defaultValue = false)
    {
        object value = GetValue(source, key);
        return value is bool ? (bool)value : defaultValue;
    }

    public static int GetInteger(IDictionary<string, object> source, string key, int defaultValue)
    {
        object value = GetValue(source, key);
        if (value == null) return defaultValue;
        try { return Convert.ToInt32(value); } catch { return defaultValue; }
    }

    public static string ComputeSha256(string value)
    {
        using (SHA256 sha = SHA256.Create())
        {
            byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(value ?? String.Empty));
            StringBuilder builder = new StringBuilder(bytes.Length * 2);
            for (int index = 0; index < bytes.Length; index++) builder.Append(bytes[index].ToString("x2"));
            return builder.ToString();
        }
    }

    public static string ResolvePath(string path, string baseDirectory)
    {
        if (String.IsNullOrWhiteSpace(path)) return String.Empty;
        if (Path.IsPathRooted(path)) return Path.GetFullPath(path);
        return Path.GetFullPath(Path.Combine(String.IsNullOrWhiteSpace(baseDirectory) ? Directory.GetCurrentDirectory() : baseDirectory, path));
    }

    public static void WriteText(string path, string content)
    {
        string directory = Path.GetDirectoryName(Path.GetFullPath(path));
        if (!String.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
        File.WriteAllText(path, content ?? String.Empty, new UTF8Encoding(false));
    }

    public static string GetString(IDictionary<string, object> source, string key)
    {
        if (source == null || !source.ContainsKey(key) || source[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(source[key]) ?? String.Empty;
    }
}
