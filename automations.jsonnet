local ha = import 'ha.libsonnet';

local gradual_raise(delay_seconds, delta_brightness) = [
  ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_on'),
  ha.actions.repeat(std.floor(255 / delta_brightness), [
    ha.actions.delay(delay_seconds),
    ha.actions._if(
      {
        condition:"state",
        entity_id:"input_boolean.light_raise_active",
        state:"off"
      },
      { stop: null }
    ),
    ha.actions.switch_on('light.master_bedroom_lights', '{{ (repeat.index * %i) | int }}' % delta_brightness),
  ]),
  ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
];

[
  ha.automation(
    'Car pico favorite pressed',
    ha.triggers.lutron_press('button.car_pico_stop'),
    ha.actions.cover('cover.athom_garage_door', 'stop')),
  ha.automation(
    'Car remote on button',
    ha.triggers.lutron_press('button.car_pico_on'),
    [
      ha.actions.switch_on('switch.garage_main_lights'),
      ha.actions.cover('cover.athom_garage_door', 'open'),
      ha.actions.unlock('lock.garage_lock'),
    ]),
  ha.automation(
    'Car remote off',
    ha.triggers.lutron_press('button.car_pico_off'),
    [
      ha.actions.cover('cover.athom_garage_door', 'close'),
      ha.actions.scene('scene.all_off'),
      ha.actions.lock(['lock.front_door_lock', 'lock.side_door_lock', 'lock.garage_lock']),
    ]),
  ha.automation(
    'Bedroom on',
    [ 
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_1_on'),
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_2_on'),
    ],
    [
      ha.actions.scene('scene.bedroom_on'),
      ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
    ]),
  ha.automation(
    'Bedroom off',
    [
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_1_off'),
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_2_off'),
    ],
    [
      ha.actions.scene('scene.all_off'),
      ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
      ha.actions.lock(['lock.front_door_lock', 'lock.side_door_lock', 'lock.garage_lock']),
    ]),
  ha.automation(
    'Bedroom favorite',
    [
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_1_stop'),
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_2_stop'),
    ],
    [
      ha.actions.scene('scene.only_bed'),
      ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
    ]),
  ha.automation(
    'Living room remote on',
    [
      ha.triggers.lutron_press('button.living_room_lights_remote_left_on'),
      ha.triggers.lutron_press('button.living_room_lights_remote_right_on'),
    ],
    [
      ha.actions.scene('scene.main_on'),
    ]),
  ha.automation(
    'Living room off',
    [
      ha.triggers.lutron_press('button.living_room_lights_remote_left_off'),
      ha.triggers.lutron_press('button.living_room_lights_remote_right_off'),
    ],
    [
      ha.actions.scene('scene.main_off'),
    ]),
  ha.automation(
    'Bed lower',
    [
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_1_lower'),
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_2_lower'),
    ],
    [
      ha.actions.scene('scene.bedroom_off'),
      ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
    ]),
  ha.automation(
    'Bedroom Lights - Gradual Raise',
    [
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_1_raise'),
      ha.triggers.lutron_press('button.master_bedroom_remote_by_bed_2_raise'),
    ],
    gradual_raise(1, 8),
  ),
  ha.automation(
    'Car remote "lower"',
    ha.triggers.lutron_press('button.car_pico_lower'),
    [
      ha.actions.cover('cover.athom_garage_door', 'close'),
      ha.actions.switch_off('switch.garage_main_lights'),
    ]
  ),
  ha.automation(
    'Sunrise alarm',
    {
      platform: 'time',
      at: 'input_datetime.wake_up',
    },
    gradual_raise(1, 1),
  ),
]