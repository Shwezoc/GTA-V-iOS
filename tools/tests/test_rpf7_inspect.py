import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("rpf7_inspect", Path(__file__).parents[1] / "rpf7-inspect.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def fixture(path: Path, encryption=mod.OPEN):
    # RPF7 root directory uses an empty name at offset zero.
    names = b"\0hello.txt\0"
    count = 2
    toc = bytearray()
    toc += struct.pack("<4I", 0, 0x7FFFFF00, 1, 1)
    name_off = 1
    packed = name_off | (1 << 40)
    toc += struct.pack("<QII", packed, 5, 0)
    data = bytearray(1024)
    data[:16] = struct.pack("<4I", mod.MAGIC, count, len(names), encryption)
    data[16:16 + len(toc)] = toc
    names_at = 16 + len(toc)
    data[names_at:names_at + len(names)] = names
    data[512:517] = b"HELLO"
    path.write_bytes(data)


class Rpf7InspectorTests(unittest.TestCase):
    def test_open_archive_indexes_file_and_empty_root_name(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "test.rpf"
            fixture(p)
            result = mod.inspect(p)
            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["fileCount"], 1)
            self.assertEqual(result["files"][0]["path"], "hello.txt")
            self.assertEqual(result["files"][0]["offset"], 512)

    def test_rejects_encrypted_toc(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "encrypted.rpf"
            fixture(p, 0x0FEFFFFF)
            with self.assertRaises(mod.RpfError):
                mod.inspect(p)

    def test_rejects_bad_magic(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "bad.rpf"
            fixture(p)
            data = bytearray(p.read_bytes())
            data[0:4] = b"NOPE"
            p.write_bytes(data)
            with self.assertRaises(mod.RpfError):
                mod.inspect(p)


if __name__ == "__main__":
    unittest.main()
