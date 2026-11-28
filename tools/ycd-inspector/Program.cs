using System.Text.Json;
using CodeWalker.GameFiles;

static RpfDirectoryEntry EnsureDirectory(RpfDirectoryEntry parent, string name)
{
    var existing = parent.Directories.FirstOrDefault(entry =>
        string.Equals(entry.Name, name, StringComparison.OrdinalIgnoreCase));
    return existing ?? RpfFile.CreateDirectory(parent, name);
}

static void AddFile(RpfDirectoryEntry parent, string sourcePath, string targetName)
{
    if (!File.Exists(sourcePath))
        throw new FileNotFoundException("Required source resource is missing.", sourcePath);
    RpfFile.CreateFile(parent, targetName, File.ReadAllBytes(sourcePath), overwrite: false);
}

static IEnumerable<RpfFile> WalkArchives(RpfFile archive)
{
    yield return archive;
    if (archive.Children == null)
        yield break;
    foreach (var child in archive.Children)
        foreach (var nested in WalkArchives(child))
            yield return nested;
}

if (args.Length > 0 && args[0] == "--pack-bmw-dlc")
{
    if (args.Length != 3)
    {
        Console.Error.WriteLine("Usage: YcdInspector --pack-bmw-dlc <extracted-bmw-assets-dir> <output-dlc.rpf>");
        return 2;
    }

    var source = Path.GetFullPath(args[1]);
    var dlcOutputPath = Path.GetFullPath(args[2]);
    var root = Path.Combine(source, "bmw-assets");
    var metadata = Path.Combine(root, "common", "data");
    var vehicleSource = Path.Combine(root, "x64", "levels", "gta5", "vehicles", "vehicles.rpf");
    var modSource = Path.Combine(root, "x64", "bmwm5f90_mods.rpf");

    Directory.CreateDirectory(Path.GetDirectoryName(dlcOutputPath)!);
    if (File.Exists(dlcOutputPath))
        File.Delete(dlcOutputPath);

    var dlc = RpfFile.CreateNew(Path.GetDirectoryName(dlcOutputPath)!, Path.GetFileName(dlcOutputPath), RpfEncryption.OPEN);
    AddFile(dlc.Root, Path.Combine(root, "content.xml"), "content.xml");
    AddFile(dlc.Root, Path.Combine(root, "setup2.xml"), "setup2.xml");

    var common = EnsureDirectory(dlc.Root, "common");
    var data = EnsureDirectory(common, "data");
    foreach (var name in new[] { "handling.meta", "carvariations.meta", "carcols.meta", "dlctext.meta" })
        AddFile(data, Path.Combine(metadata, name), name);

    var dataLevels = EnsureDirectory(data, "levels");
    var dataGta5 = EnsureDirectory(dataLevels, "gta5");
    AddFile(dataGta5, Path.Combine(metadata, "levels", "gta5", "vehicles.meta"), "vehicles.meta");

    var x64 = EnsureDirectory(dlc.Root, "x64");
    var mods = RpfFile.CreateNew(x64, "bmwm5f90_mods.rpf", RpfEncryption.OPEN);
    foreach (var file in Directory.GetFiles(modSource, "*.yft", SearchOption.TopDirectoryOnly).OrderBy(Path.GetFileName))
        AddFile(mods.Root, file, Path.GetFileName(file));
    if (mods.Root.Files.Count == 0)
        throw new InvalidDataException("BMW mod-parts RPF would be empty.");

    var x64Levels = EnsureDirectory(x64, "levels");
    var gta5 = EnsureDirectory(x64Levels, "gta5");
    var vehicles = EnsureDirectory(gta5, "vehicles");
    var vehicleRpf = RpfFile.CreateNew(vehicles, "vehicles.rpf", RpfEncryption.OPEN);
    foreach (var name in new[] { "bmwm5f90.yft", "bmwm5f90.ytd", "bmwm5f90_hi.yft" })
        AddFile(vehicleRpf.Root, Path.Combine(vehicleSource, name), name);

    var check = new RpfFile(dlcOutputPath, Path.GetFileName(dlcOutputPath));
    check.ScanStructure(null, null);
    if (!string.IsNullOrEmpty(check.LastError))
        throw new InvalidDataException("Packed DLC RPF failed CodeWalker scan: " + check.LastError);

    var archives = WalkArchives(check).ToArray();
    var resources = archives
        .SelectMany(archive => archive.AllEntries ?? new List<RpfEntry>())
        .OfType<RpfResourceFileEntry>()
        .Select(entry => entry.Name)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);
    var requiredResources = new[] { "bmwm5f90.yft", "bmwm5f90.ytd", "bmwm5f90_hi.yft" };
    var missingResources = requiredResources.Where(name => !resources.Contains(name)).ToArray();
    if (missingResources.Length > 0)
        throw new InvalidDataException("Packed DLC is missing native vehicle resources: " + string.Join(", ", missingResources));

    var report = new
    {
        status = "pass",
        output = Path.GetFileName(dlcOutputPath),
        bytes = new FileInfo(dlcOutputPath).Length,
        rpfVersion = "RPF7",
        encryption = "OPEN",
        archiveCount = archives.Length,
        resourceCount = resources.Count,
        requiredVehicleResources = requiredResources,
        modPartCount = mods.Root.Files.Count,
        nativeVehicleResourcesFound = requiredResources,
        codeWalkerRoundTrip = true,
        notes = new[]
        {
            "The DLC package was built from the supplied native RSC7 resources and vehicle metadata.",
            "A successful RPF7 scan validates archive structure, not in-game DLC mounting or vehicle spawning.",
            "The generated DLC binary is intentionally not uploaded as a public CI artifact."
        }
    };
    Console.WriteLine(JsonSerializer.Serialize(dlcReport, new JsonSerializerOptions { WriteIndented = true }));
    return 0;
}

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
