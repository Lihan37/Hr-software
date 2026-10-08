"""Read-only structural profiler for the supplied legacy HR workbook."""

from __future__ import annotations

import collections
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def column_number(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference).group(0)
    result = 0
    for letter in letters:
        result = result * 26 + ord(letter) - 64
    return result


def main() -> None:
    path = Path(sys.argv[1])
    with zipfile.ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("m:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.iterfind(".//m:t", NS)))

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relationships}

        print(json.dumps({"file": path.name, "sheets": len(workbook.findall("m:sheets/m:sheet", NS))}))
        for sheet in workbook.findall("m:sheets/m:sheet", NS):
            name = sheet.attrib["name"]
            rel_id = sheet.attrib[f"{{{DOC_REL_NS}}}id"]
            target = targets[rel_id].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            root = ET.fromstring(archive.read(target))
            rows: list[dict[int, object]] = []
            formulas = 0
            for row in root.findall("m:sheetData/m:row", NS):
                values: dict[int, object] = {}
                for cell in row.findall("m:c", NS):
                    ref = cell.attrib["r"]
                    col = column_number(ref)
                    cell_type = cell.attrib.get("t")
                    value_node = cell.find("m:v", NS)
                    inline_node = cell.find("m:is", NS)
                    formula_node = cell.find("m:f", NS)
                    if formula_node is not None:
                        formulas += 1
                    if cell_type == "s" and value_node is not None:
                        value: object = shared_strings[int(value_node.text)]
                    elif cell_type == "inlineStr" and inline_node is not None:
                        value = "".join(node.text or "" for node in inline_node.iterfind(".//m:t", NS))
                    elif value_node is not None:
                        value = value_node.text
                    else:
                        value = None
                    if value not in (None, ""):
                        values[col] = value
                rows.append(values)

            populated = [(index + 1, row) for index, row in enumerate(rows) if row]
            preview = populated[:20]
            print(json.dumps({
                "sheet": name,
                "dimension": root.find("m:dimension", NS).attrib.get("ref") if root.find("m:dimension", NS) is not None else None,
                "populatedRows": len(populated),
                "formulaCells": formulas,
                "preview": preview,
            }, ensure_ascii=False))


if __name__ == "__main__":
    main()
