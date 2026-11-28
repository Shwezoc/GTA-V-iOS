using System.Text.Json;
using CodeWalker.GameFiles;

if (args.Length != 2)
{
    Console.Error.WriteLine("Usage: YcdInspector <input.ycd> <output-directory>");
    return 2;
}

var input = Path.GetFullPath(args[0]);
var output = Path.GetFullPath(args[1]);
Directory.CreateDirectory(output);

var raw = File.ReadAllBytes(input);
if (raw.Length < 16 || System.Text.Encoding.ASCII.GetString(raw, 0, 4) != "RSC7")
    throw new InvalidDataException("Input is not an RSC7 resource.");

var ycd = RpfFile.GetResourceFile<YcdFile>(raw);
if (ycd?.ClipDictionary == null)
    throw new InvalidDataException("CodeWalker did not produce a ClipDictionary.");

var xml = YcdXml.GetXml(ycd);
var xmlPath = Path.Combine(output, Path.GetFileName(input) + ".xml");
File.WriteAllText(xmlPath, xml);

var clips = (ycd.ClipMapEntries ?? Array.Empty<ClipMapEntry>())
    .Select(entry => new
    {
        hash = entry.Hash.ToString(),
        name = entry.Clip?.Name,
        shortName = entry.Clip?.ShortName,
        type = entry.Clip?.Type.ToString()
    })
    .OrderBy(item => item.name)
    .ToArray();

var animations = (ycd.AnimMapEntries ?? Array.Empty<AnimationMapEntry>())
    .Where(entry => entry.Animation != null)
    .Select(entry =>
    {
        var animation = entry.Animation!;
        var tracks = animation.BoneIds?.data_items ?? Array.Empty<AnimationBoneId>();
        return new
        {
            hash = entry.Hash.ToString(),
            frames = animation.Frames,
            durationSeconds = animation.Duration,
            sequenceFrameLimit = animation.SequenceFrameLimit,
            boneTrackCount = tracks.Length,
            boneIds = tracks.Select(track => track.BoneId).Distinct().OrderBy(id => id).ToArray(),
            trackTypes = tracks.Select(track => track.Track).Distinct().OrderBy(id => id).ToArray()
        };
    })
    .ToArray();

var report = new
{
    source = Path.GetFileName(input),
    sourceBytes = raw.Length,
    rscVersion = BitConverter.ToUInt32(raw, 4),
    clips = new { count = clips.Length, items = clips },
    animations = new { count = animations.Length, items = animations },
    xml = Path.GetFileName(xmlPath),
    notes = new[]
    {
        "Bone IDs are decoded animation track identifiers, not yet mapped to a specific ped skeleton.",
        "Compatibility with Franklin must be checked against the actual target skeleton hierarchy."
    }
};

var jsonPath = Path.Combine(output, Path.GetFileName(input) + ".report.json");
File.WriteAllText(jsonPath, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine(JsonSerializer.Serialize(new
{
    input = Path.GetFileName(input),
    clips = clips.Length,
    animations = animations.Length,
    xml = xmlPath,
    report = jsonPath
}));
return 0;
