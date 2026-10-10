"""Headless Blender inspection/rendering for the existing ghe Ngo assets."""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--export-actor", action="store_true")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


args = arguments()
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
scene = bpy.context.scene
actors = [obj for obj in scene.objects if obj.name.startswith("Athlete_") and "ROWER" in obj.name and obj.type == "EMPTY"]
report = {
    "blenderVersion": bpy.app.version_string,
    "input": str(Path(args.input).resolve()),
    "objects": len(scene.objects),
    "rowerRoots": len(actors),
    "armatures": len([obj for obj in scene.objects if obj.type == "ARMATURE"]),
    "actions": [{"name": action.name, "frames": list(action.frame_range)} for action in bpy.data.actions],
}
(output / "blender-inspection.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report), flush=True)

if args.render or args.export_actor:
    if not actors:
        raise RuntimeError("No rower root found in input GLB")
    actor = sorted(actors, key=lambda obj: int(obj.name.split("_")[1]))[0]
    visible = {actor, *actor.children_recursive}
    paddle = scene.objects.get("Paddle_" + actor.name.split("_")[1])
    if paddle:
        visible.update({paddle, *paddle.children_recursive})
    for obj in scene.objects:
        obj.hide_render = obj not in visible
    scene.frame_set(6)
    if args.export_actor:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in visible:
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(output / "athlete-roundtrip.glb"), export_format="GLB", use_selection=True, export_animations=True)
        report["roundtripGlb"] = str(output / "athlete-roundtrip.glb")
        (output / "blender-inspection.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not args.render:
        sys.exit(0)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = [obj.matrix_world @ Vector(corner) for obj in visible if obj.type == "MESH" for corner in obj.evaluated_get(depsgraph).bound_box]
    centre = (Vector(tuple(min(p[i] for p in points) for i in range(3))) + Vector(tuple(max(p[i] for p in points) for i in range(3)))) / 2
    floor_z = min(p.z for p in points) - .025
    bpy.ops.mesh.primitive_plane_add(size=200, location=(centre.x, centre.y, floor_z))
    floor = bpy.context.object
    floor.name = "Studio_Ground"
    material = bpy.data.materials.new("Studio_Ground_Material")
    material.diffuse_color = (.12, .15, .16, 1)
    floor.data.materials.append(material)
    for name, offset, energy, size in [
        ("Key", (2, -3, 4), 650, 3),
        ("Fill", (-3, -1, 2), 350, 4),
        ("Rim", (1, 3, 3), 500, 2),
    ]:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        scene.collection.objects.link(light)
        light.location = centre + Vector(offset)
        light.rotation_euler = (centre - light.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("Studio_Camera")
    camera = bpy.data.objects.new("Studio_Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.75
    scene.world = bpy.data.worlds.new("Studio_World")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.12, .15, .18, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .45
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    for name, offset in [("front", (2.7, -2.7, 1.2)), ("side", (0, -3.8, .8))]:
        camera.location = centre + Vector(offset)
        camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(output / (name + ".png"))
        bpy.ops.render.render(write_still=True)
    # Retain the selected actor, paddle and studio. Remove unused action slots
    # so the editable file does not carry the other 54 crew rigs and keyframes.
    for obj in list(scene.objects):
        if obj.hide_render:
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        for slot in list(action.slots):
            if not slot.users():
                action.slots.remove(slot)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "athlete-studio.blend"))
