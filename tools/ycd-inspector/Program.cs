using System.Text.Json;
using CodeWalker.GameFiles;

if (args.Length > 0 && args[0] == "--pack-ycd")
{
    if (args.Length != 3)
    {
        Console.Error.WriteLine("Usage: YcdInspector --pack-ycd <input.ycd.xml> <output.ycd>");
        return 2;
    }

    var xmlInput = Path.GetFullPath(args[1]);
    var ycdOutput = Path.GetFullPath(args[2]);
    var xmlText = File.ReadAllText(xmlInput);
    var packedYcd = XmlYcd.GetYcd(xmlText);
    if (packedYcd?.ClipDictionary == null)
        throw new InvalidDataException("CodeWalker XML parser did not produce a ClipDictionary.");

    var resourceBytes = packedYcd.Save();
    if (resourceBytes.Length < 16 || System.Text.Encoding.ASCII.GetString(resourceBytes, 0, 4) != "RSC7")
        throw new InvalidDataException("CodeWalker did not produce a valid RSC7 YCD resource.");

    var roundTrip = RpfFile.GetResourceFile<YcdFile>(resourceBytes);
    if (roundTrip?.ClipDictionary == null)
        throw new InvalidDataException("Packed YCD failed CodeWalker round-trip validation.");

    Directory.CreateDirectory(Path.GetDirectoryName(ycdOutput)!);
    File.WriteAllBytes(ycdOutput, resourceBytes);
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        input = Path.GetFileName(xmlInput),
        output = ycdOutput,
        bytes = resourceBytes.Length,
        rscMagic = "RSC7",
        clips = roundTrip.ClipMapEntries?.Length ?? 0,
        animations = roundTrip.AnimMapEntries?.Length ?? 0,
        roundTripValidated = true
    }));
    return 0;
}

if (args.Length is < 2 or > 3)
{
    Console.Error.WriteLine("Usage: YcdInspector <input.ycd> <output-directory> [ped-skeleton-template.json]");
    return 2;
}

var input = Path.GetFullPath(args[0]);
var output = Path.GetFullPath(args[1]);
Directory.CreateDirectory(output);

Dictionary<ushort, (string Name, string? Parent)>? skeletonBones = null;
string? skeletonName = null;
if (args.Length == 3)
{
    using var skeletonDoc = JsonDocument.Parse(File.ReadAllText(Path.GetFullPath(args[2])));
    var root = skeletonDoc.RootElement;
    skeletonName = root.TryGetProperty("armature", out var armature) ? armature.GetString() : "unknown";
    skeletonBones = root.GetProperty("bones").EnumerateArray().ToDictionary(
        bone => bone.GetProperty("tag").GetUInt16(),
        bone => (
            bone.GetProperty("name").GetString() ?? "UNKNOWN",
            bone.TryGetProperty("parent", out var parent) && parent.ValueKind != JsonValueKind.Null
                ? parent.GetString()
                : null));
}

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
        var ids = tracks.Select(track => track.BoneId).Distinct().OrderBy(id => id).ToArray();
        var mapped = skeletonBones == null
            ? Array.Empty<object>()
            : ids.Where(skeletonBones.ContainsKey)
                .Select(id => (object)new
                {
                    id,
                    name = skeletonBones[id].Name,
                    parent = skeletonBones[id].Parent
                }).ToArray();
        var unmapped = skeletonBones == null
            ? Array.Empty<ushort>()
            : ids.Where(id => !skeletonBones.ContainsKey(id)).ToArray();
        return new
        {
            hash = entry.Hash.ToString(),
            frames = animation.Frames,
            durationSeconds = animation.Duration,
            sequenceFrameLimit = animation.SequenceFrameLimit,
            boneTrackCount = tracks.Length,
            uniqueBoneIdCount = ids.Length,
            boneIds = ids,
            mappedBoneCount = mapped.Length,
            mappedBones = mapped,
            unmappedBoneIds = unmapped
        };
    })
    .ToArray();

var allIds = animations.SelectMany(animation => animation.boneIds).Distinct().OrderBy(id => id).ToArray();
var mappedIds = skeletonBones == null
    ? Array.Empty<ushort>()
    : allIds.Where(skeletonBones.ContainsKey).ToArray();
var unmappedIds = skeletonBones == null
    ? Array.Empty<ushort>()
    : allIds.Where(id => !skeletonBones.ContainsKey(id)).ToArray();

var report = new
{
    source = Path.GetFileName(input),
    sourceBytes = raw.Length,
    rscVersion = BitConverter.ToUInt32(raw, 4),
    clips = new { count = clips.Length, items = clips },
    animations = new { count = animations.Length, items = animations },
    skeletonCompatibility = skeletonBones == null ? null : new
    {
        skeleton = skeletonName,
        skeletonBoneCount = skeletonBones.Count,
        uniqueAnimationBoneIdCount = allIds.Length,
        matchedBoneCount = mappedIds.Length,
        unmatchedBoneCount = unmappedIds.Length,
        coverage = allIds.Length == 0 ? 0.0 : Math.Round((double)mappedIds.Length / allIds.Length, 4),
        mappedBones = mappedIds.Select(id => new { id, name = skeletonBones[id].Name, parent = skeletonBones[id].Parent }).ToArray(),
        unmappedBoneIds = unmappedIds
    },
    xml = Path.GetFileName(xmlPath),
    notes = new[]
    {
        "Bone IDs are decoded animation track identifiers.",
        skeletonBones == null
            ? "No target skeleton template was supplied; compatibility was not evaluated."
            : "Bone IDs were matched by exact GTA bone tag against the supplied target skeleton template. This validates identifiers, not runtime playback or retargeted motion."
    }
};

var jsonPath = Path.Combine(output, Path.GetFileName(input) + ".report.json");
File.WriteAllText(jsonPath, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine(JsonSerializer.Serialize(new
{
    input = Path.GetFileName(input),
    clips = clips.Length,
    animations = animations.Length,
    skeleton = skeletonName,
    matchedBones = mappedIds.Length,
    unmatchedBones = unmappedIds.Length,
    xml = xmlPath,
    report = jsonPath
}));
return 0;
