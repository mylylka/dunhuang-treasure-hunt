"""Blender worker used by prepare-desert-decoration-overlook-v001.py."""

import json
from pathlib import Path
import sys

import bmesh
import bpy


def keep_visible_parts(obj, limit):
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    pending = set(mesh.faces)
    parts = []
    for face in mesh.faces:
        if face not in pending:
            continue
        part, visit = [], [face]
        pending.remove(face)
        while visit:
            current = visit.pop()
            part.append(current)
            for edge in current.edges:
                for neighbor in edge.link_faces:
                    if neighbor in pending:
                        pending.remove(neighbor)
                        visit.append(neighbor)
        parts.append(part)
    parts.sort(key=lambda part: sum(face.calc_area() for face in part), reverse=True)
    bmesh.ops.delete(mesh, geom=[face for part in parts[limit:] for face in part], context="FACES")
    mesh.to_mesh(obj.data)
    mesh.free()


def simplify(source, destination, limit):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source, import_pack_images=True, merge_vertices=True)
    obj, = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Fuse leaf surfaces and coincident seams before reducing the connected volume.
    obj.data.remesh_voxel_size = max(obj.dimensions) / 110
    obj.data.remesh_voxel_adaptivity = .05
    bpy.ops.object.voxel_remesh()
    keep_visible_parts(obj, 18)
    triangulate = obj.modifiers.new("Count actual triangles", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=triangulate.name)
    modifier = obj.modifiers.new("Distance mesh", "DECIMATE")
    modifier.ratio = (limit - 6) / len(obj.data.polygons)
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.validate()
    bpy.ops.export_scene.gltf(
        filepath=destination, export_format="GLB", use_selection=True,
        export_image_format="NONE", export_texcoords=False, export_vertex_color="NONE",
    )


if __name__ == "__main__":
    job_path = Path(sys.argv[sys.argv.index("--") + 1])
    for job in json.loads(job_path.read_text()):
        simplify(**job)
