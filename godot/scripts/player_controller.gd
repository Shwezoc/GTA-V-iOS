extends CharacterBody3D

@export var move_speed := 4.2
@export var run_speed := 6.4
@export var acceleration := 18.0

func _physics_process(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := Vector3(input.x, 0, input.y)
	if direction.length() > 1.0:
		direction = direction.normalized()
	var target_speed := run_speed if Input.is_key_pressed(KEY_SHIFT) else move_speed
	var desired := direction * target_speed
	velocity.x = move_toward(velocity.x, desired.x, acceleration * delta)
	velocity.z = move_toward(velocity.z, desired.z, acceleration * delta)
	if direction.length() > 0.08:
		rotation.y = lerp_angle(rotation.y, atan2(-direction.x, -direction.z), 0.18)
	if not is_on_floor():
		velocity.y -= 9.8 * delta
	else:
		velocity.y = 0.0
	move_and_slide()
