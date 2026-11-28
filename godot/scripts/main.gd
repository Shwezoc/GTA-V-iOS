extends Node3D

const PLAYER_SCRIPT = preload("res://scripts/player_controller.gd")
const CAR_SCRIPT = preload("res://scripts/car_controller.gd")

var player: CharacterBody3D
var car: CharacterBody3D
var camera: Camera3D
var in_car := false
var status_label: Label

func _ready() -> void:
	_setup_input()
	_build_environment()
	_build_player()
	_build_car()
	_build_hud()
	_try_load_models()

func _process(_delta: float) -> void:
	if Input.is_action_just_pressed("interact"):
		_toggle_vehicle()
	if camera:
		var target := car.global_position if in_car else player.global_position
		camera.global_position = camera.global_position.lerp(target + Vector3(0, 4.2, 8.5), 0.08)
		camera.look_at(target + Vector3(0, 1.0, 0), Vector3.UP)
	if status_label:
		status_label.text = "BMW M5 F90  •  DRIVE" if in_car else "FRANKLIN  •  ON FOOT"

func _physics_process(_delta: float) -> void:
	if player and not in_car:
		player.set_physics_process(true)
	elif player:
		player.set_physics_process(false)
	if car:
		car.set_physics_process(in_car or car.get_meta("started", false))

func _setup_input() -> void:
	_add_key("move_forward", KEY_W)
	_add_key("move_back", KEY_S)
	_add_key("move_left", KEY_A)
	_add_key("move_right", KEY_D)
	_add_key("interact", KEY_E)
	_add_key("brake", KEY_SPACE)

func _add_key(action: String, keycode: Key) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	var event := InputEventKey.new()
	event.physical_keycode = keycode
	InputMap.action_add_event(action, event)

func _build_environment() -> void:
	var world := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.62, 0.69, 0.76)
	env.ambient_light_energy = 0.8
	world.environment = env
	add_child(world)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.shadow_enabled = true
	add_child(sun)
	_box("Ground", Vector3(0, -0.3, 0), Vector3(100, 0.5, 100), Color(0.22, 0.32, 0.25), true)
	_box("Road", Vector3(0, -0.02, 0), Vector3(12, 0.08, 90), Color(0.075, 0.085, 0.10), true)
	for z in range(-40, 45, 8):
		_box("RoadMark", Vector3(0, 0.04, z), Vector3(0.16, 0.025, 3.5), Color(0.88, 0.82, 0.62), false)
	for i in range(12):
		var side := -1.0 if i % 2 == 0 else 1.0
		var z := -34.0 + float(i) * 6.2
		var h := 5.0 + float((i * 7) % 9)
		var color := Color(0.28, 0.34, 0.39) if i % 2 == 0 else Color(0.43, 0.42, 0.38)
		_box("CityBlock", Vector3(side * 12.0, h * 0.5, z), Vector3(7, h, 5), color, true)

func _box(label: String, pos: Vector3, size: Vector3, color: Color, collision: bool) -> Node3D:
	var body: Node3D
	if collision:
		body = StaticBody3D.new()
	else:
		body = Node3D.new()
	body.name = label
	body.position = pos
	var mesh := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size
	mesh.mesh = shape
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.82
	mesh.material_override = mat
	body.add_child(mesh)
	if collision:
		var collider := CollisionShape3D.new()
		var box_shape := BoxShape3D.new()
		box_shape.size = size
		collider.shape = box_shape
		body.add_child(collider)
	add_child(body)
	return body

func _build_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Franklin"
	player.set_script(PLAYER_SCRIPT)
	player.position = Vector3(3.0, 1.0, 4.0)
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.38
	capsule.height = 1.8
	var mesh := MeshInstance3D.new()
	mesh.mesh = capsule
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.24, 0.29, 0.34)
	mesh.material_override = mat
	player.add_child(mesh)
	var collider := CollisionShape3D.new()
	var capsule_shape := CapsuleShape3D.new()
	capsule_shape.radius = 0.38
	capsule_shape.height = 1.8
	collider.shape = capsule_shape
	player.add_child(collider)
	add_child(player)

func _build_car() -> void:
	car = CharacterBody3D.new()
	car.name = "BMW_M5_F90"
	car.set_script(CAR_SCRIPT)
	car.position = Vector3(0, 0.85, 0)
	var chassis := BoxMesh.new()
	chassis.size = Vector3(2.05, 0.72, 4.6)
	var body_mesh := MeshInstance3D.new()
	body_mesh.mesh = chassis
	var paint := StandardMaterial3D.new()
	paint.albedo_color = Color(0.045, 0.075, 0.12)
	paint.metallic = 0.82
	paint.roughness = 0.24
	body_mesh.material_override = paint
	car.add_child(body_mesh)
	var cabin := BoxMesh.new()
	cabin.size = Vector3(1.72, 0.66, 2.1)
	var cabin_mesh := MeshInstance3D.new()
	cabin_mesh.mesh = cabin
	cabin_mesh.position = Vector3(0, 0.62, -0.2)
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.025, 0.045, 0.065, 0.86)
	glass.metallic = 0.35
	glass.roughness = 0.12
	cabin_mesh.material_override = glass
	car.add_child(cabin_mesh)
	var collider := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = Vector3(2.05, 1.25, 4.6)
	collider.shape = box_shape
	car.add_child(collider)
	add_child(car)
	car.set_meta("started", true)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	status_label = Label.new()
	status_label.position = Vector2(24, 24)
	status_label.add_theme_font_size_override("font_size", 24)
	status_label.add_theme_color_override("font_color", Color.WHITE)
	layer.add_child(status_label)
	var hint := Label.new()
	hint.text = "WASD — MOVE / DRIVE     E — ENTER / EXIT     SPACE — BRAKE"
	hint.position = Vector2(24, 62)
	hint.add_theme_font_size_override("font_size", 15)
	hint.add_theme_color_override("font_color", Color(0.88, 0.92, 0.96))
	layer.add_child(hint)

func _toggle_vehicle() -> void:
	if not player or not car:
		return
	if in_car:
		in_car = false
		player.global_position = car.global_position + car.global_transform.basis.x * 2.0 + Vector3.UP
		player.visible = true
	else:
		if player.global_position.distance_to(car.global_position) <= 4.0:
			in_car = true
			player.visible = false

func _try_load_models() -> void:
	# Models are optional until the artifact-import step stages them.
	var bmw_path := "res://browser/assets/models/bmw-m5-f90/bmwm5f90_hi.glb"
	if ResourceLoader.exists(bmw_path):
		var packed := load(bmw_path) as PackedScene
		if packed:
			var model := packed.instantiate()
			model.name = "BMW_M5_F90_GLTF"
			model.scale = Vector3.ONE * 0.01
			car.add_child(model)
