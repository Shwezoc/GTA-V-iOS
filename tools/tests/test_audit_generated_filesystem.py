import importlib.util
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("audit_generated_filesystem", Path(__file__).parents[1] / "audit_generated_filesystem.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class GeneratedFilesystemAuditTests(unittest.TestCase):
    def test_finds_archive_and_file_io_candidates(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "gtav_init.cpp").write_text(
                "auto* device = rage::fiDevice::GetDevice();\n"
                "auto* archive = RpfManager::OpenPackfile(path);\n"
                "auto f = fopen(name, \"rb\");\n",
                encoding="utf-8",
            )
            result = mod.scan(root)
            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["sourceFiles"], 1)
            self.assertGreaterEqual(result["categoryCounts"]["rage_file_device"], 1)
            self.assertGreaterEqual(result["categoryCounts"]["rpf_archive"], 1)
            self.assertGreaterEqual(result["categoryCounts"]["c_file_io"], 1)

    def test_rejects_empty_directory(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                mod.scan(Path(d))


if __name__ == "__main__":
    unittest.main()
