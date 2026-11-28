extends CharacterBody3D

@export var acceleration := 13.0
@export var max_speed := 34.0
@export var reverse_speed := 10.0
@export var steering_rate := 1.55
var forward_speed := 0.0

func _physics_process(delta: float) -> void:
	var throttle := Input.get_action_strength("move_forward") - Input.get_action_strength("move_back")
	var steering := Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	var limit := max_speed if throttle >= 0.0 else reverse_speed
	forward_speed = move_toward(forward_speed, throttle * limit, acceleration * delta)
	if Input.is_action_pressed("brake"):
		forward_speed = move_toward(forward_speed, 0.0, acceleration * 2.4 * delta)
	rotation.y -= steering * steering_rate * delta * clamp(absf(forward_speed) / 8.0, 0.18, 1.0) * signf(forward_speed)
	var forward := -global_transform.basis.z
	velocity.x = forward.x * forward_speed
	velocity.z = forward.z * forward_speed
	velocity.y = -9.8 * delta
	move_and_slide()
	forward_speed *= 0.996
