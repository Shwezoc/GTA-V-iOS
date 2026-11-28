use anyhow::{bail, Context, Result};
use rage_formats::{parse_yft, parse_ytd};
use rage_render::{export_glb, render_parts, Facing, GlbOptions, RenderOptions, RenderPart, TextureSet, View};
use std::{env, fs, path::{Path, PathBuf}};

fn convert(yft_path: &Path, ytd_path: &Path, output_dir: &Path) -> Result<()> {
    let stem = yft_path.file_stem().and_then(|s| s.to_str()).context("invalid YFT filename")?;
    let yft_bytes = fs::read(yft_path).with_context(|| format!("read {}", yft_path.display()))?;
    let ytd_bytes = fs::read(ytd_path).with_context(|| format!("read {}", ytd_path.display()))?;

    let fragment = parse_yft(&yft_bytes).with_context(|| format!("parse GTA V fragment {}", yft_path.display()))?;
    let fragment_parts = fragment.render_parts();
    let parts: Vec<RenderPart<'_>> = fragment_parts.into_iter().map(RenderPart::from).collect();
    if parts.is_empty() {
        bail!("{} contains no renderable fragment parts", yft_path.display());
    }

    let ytd_textures = parse_ytd(&ytd_bytes).with_context(|| format!("parse GTA V texture dictionary {}", ytd_path.display()))?;
    let mut textures = TextureSet::new();
    let texture_failures = textures.push_layer(&ytd_textures);

    let paint = Some([115, 120, 128]);
    let glb_options = GlbOptions {
        facing: Facing::PositiveY,
        paint,
        max_texture: 2048,
        ..GlbOptions::default()
    };
    let (glb, glb_report) = export_glb(&parts, &textures, &glb_options)
        .with_context(|| format!("export {} to binary glTF", stem))?;
    if glb.is_empty() || glb_report.triangles == 0 {
        bail!("{} produced an empty model ({} triangles)", stem, glb_report.triangles);
    }

    let render_options = RenderOptions {
        width: 1440,
        height: 1080,
        view: View::Iso,
        paint,
        ..RenderOptions::default()
    };
    let mut rendered = render_parts(&parts, &textures, &render_options, &[View::Iso])
        .with_context(|| format!("render preview for {}", stem))?;
    let (_, preview, preview_report) = rendered.pop().context("renderer returned no preview")?;

    fs::create_dir_all(output_dir)?;
    let glb_path = output_dir.join(format!("{stem}.glb"));
    let preview_path = output_dir.join(format!("{stem}-preview.png"));
    fs::write(&glb_path, &glb)?;
    preview.save(&preview_path)?;

    let report_path = output_dir.join(format!("{stem}-report.txt"));
    let report = format!(
        "Source YFT: {}\nSource YTD: {}\nFragment name: {}\nParts: {}\nYTD textures: {}\nUndecodable textures: {}\nGLB bytes: {}\nGLB triangles: {}\nGLB geometries: {}\nGLB missing textures: {:?}\nPreview triangles: {}\nPreview missing textures: {:?}\n",
        yft_path.display(), ytd_path.display(), fragment.name, parts.len(), ytd_textures.len(),
        texture_failures.len(), glb.len(), glb_report.triangles, glb_report.geometries,
        glb_report.missing_textures, preview_report.triangles, preview_report.missing_textures
    );
    fs::write(&report_path, &report)?;
    println!("{report}");
    Ok(())
}

fn main() -> Result<()> {
    let mut args = env::args().skip(1);
    let asset_root = PathBuf::from(args.next().context("usage: bmw-yft-to-glb <asset-root> <output-dir>")?);
    let output_dir = PathBuf::from(args.next().context("missing output directory")?);
    let yft_root = asset_root.join("x64/levels/gta5/vehicles/vehicles.rpf");
    let ytd_path = yft_root.join("bmwm5f90.ytd");
    let base_yft = yft_root.join("bmwm5f90.yft");
    let hi_yft = yft_root.join("bmwm5f90_hi.yft");
    for path in [&ytd_path, &base_yft, &hi_yft] {
        if !path.is_file() {
            bail!("required GTA V model resource not found: {}", path.display());
        }
    }
    convert(&base_yft, &ytd_path, &output_dir)?;
    convert(&hi_yft, &ytd_path, &output_dir)?;
    println!("BMW M5 F90 base and high-detail GLB conversion completed.");
    Ok(())
}
