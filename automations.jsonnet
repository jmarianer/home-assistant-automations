local ha = import 'ha.libsonnet';

local gradual_raise(time_in_seconds) = [
  ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_on'),
  /*
  Start at brightness 0. End at brightness 255 after time_in_seconds.
  Every second the brightness should increase but much slower at the beginning
  and faster towards the end, so that it feels more natural. A possible formula
  for this is:
    brightness = 255 * (t / time_in_seconds) ^ 2
  */
  ha.actions.repeat(time_in_seconds, [
    ha.actions.delay(1),
    ha.actions._if(
      {
        condition:"state",
        entity_id:"input_boolean.light_raise_active",
        state:"off"
      },
      { stop: null }
    ),
    ha.actions.light_on('light.master_bedroom_lights', '{{ (255 * ((repeat.index / %i) ** 2)) | int }}' % time_in_seconds),

  ]),
  ha.actions.input_boolean('input_boolean.light_raise_active', 'turn_off'),
];

local flair_zones = [
  { name: "Angela's Office", slug: 'angelas_office' },
  { name: 'Bedroom', slug: 'bedroom' },
  { name: 'Hallway', slug: 'hallway' },
  { name: "Joey's Office", slug: 'joeys_office' },
  { name: 'Living Room', slug: 'living_room' },
];

local flair_zone_card(zone) =
  local climate = 'climate.' + zone.slug + '_room';
  local presence = 'select.' + zone.slug + '_activity_status';
  {
    type: 'tile',
    entity: climate,
    name: zone.name,
    vertical: false,
    grid_options: { columns: 'full' },
    features_position: 'inline',
    features: [
      {
        type: 'custom:service-call',
        entries: [
          {
            type: 'spinbox',
            entity_id: climate,
            value_attribute: 'temperature',
            icon: '',
            autofill_entity_id: false,
            label: '{{ value | float }}',
            step: 1,
            range: [
              '{{ state_attr("%s", "min_temp") }}' % climate,
              '{{ state_attr("%s", "max_temp") }}' % climate,
            ],
            hold_action: { action: 'repeat' },
            tap_action: {
              action: 'perform-action',
              perform_action: 'climate.set_temperature',
              target: { entity_id: climate },
              data: { temperature: '{{ value | float }}' },
            },
          },
          {
            type: 'toggle',
            thumb: 'md3-switch',
            entity_id: presence,
            value_attribute: 'state',
            autofill_entity_id: false,
            checked_values: ['Active'],
            checked_icon: 'mdi:account-check',
            unchecked_icon: 'mdi:account-off',
            tap_action: {
              action: 'perform-action',
              perform_action: 'select.select_option',
              target: { entity_id: presence },
              data: { option: "{{ 'Active' if checked else 'Inactive' }}" },
            },
            styles: ':host { flex-basis: 50%; }',
          },
        ],
      },
    ],
  };

[
  ha.boolean_helper('Light Raise Active', false, 'Indicates whether the gradual light raise is active.'),
  ha.time_helper('Wake Up', 'Time for triggering the sunrise alarm automation.'),
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
      ha.triggers.lutron_press('button.living_room_living_room_wall_switch_on'),
    ],
    [
      ha.actions.scene('scene.main_on'),
    ]),
  ha.automation(
    'Living room off',
    [
      ha.triggers.lutron_press('button.living_room_lights_remote_left_off'),
      ha.triggers.lutron_press('button.living_room_lights_remote_right_off'),
      ha.triggers.lutron_press('button.living_room_living_room_wall_switch_off'),
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
    gradual_raise(90),
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
    'Garage Light Auto Off',
    ha.triggers.state('switch.garage_main_lights', to='on'),
    [
      ha.actions.delay(300),
      ha.actions.switch_off('switch.garage_main_lights'),
    ],
    mode='restart',
  ),
  ha.automation(
    'High CO2 Alert (bedroom)',
    ha.triggers.numeric_state('sensor.bedroom_bedroom_co2_monitor_carbon_dioxide', above=1500),
    ha.actions.notify(
      'mobile_app_joeym_iphone',
      'CO₂ is {{ states("sensor.bedroom_bedroom_co2_monitor_carbon_dioxide") }} ppm in the bedroom — time to open a window.',
      'High CO₂',
    ),
  ),
  ha.automation(
    'High CO2 Alert (office)',
    ha.triggers.numeric_state('sensor.aranet4_04f8f_carbon_dioxide', above=700),
    ha.actions.notify(
      'mobile_app_joeym_iphone',
      'CO₂ is {{ states("sensor.aranet4_04f8f_carbon_dioxide") }} ppm in the office — time to open a window.',
      'High CO₂',
    ),
  ),
# This doesn't wake me up and it wakes my wife up too early. Experiment tried,
# lesson learned. :)
# ha.automation(
#   'Sunrise alarm',
#   {
#     platform: 'time',
#     at: 'input_datetime.wake_up',
#   },
#   gradual_raise(1800),
# ),
  ha.dashboard('Joey', 'dashboard-joey', [
    {
      icon: 'mdi:home',
      path: 'overview',
      type: 'sections',
      max_columns: 3,
      sections: [
        {
          column_span: 3,
          type: 'grid',
          cards: [
            ha.tile('lock.front_door_lock'),
            ha.template(
              'mdi:dishwasher',
              'Dishwasher time remaining', 
              "{% set t = states('sensor.dishwasher_remaining_time') | int(0) %} {{ (t // 60) }}h {{ (t % 60) }}m",
            ),
            ha.tile('weather.forecast_home', action='none', name='Weather'),
          ],
        },
        {
          column_span: 3,
          type: 'grid',
          cards: [
            ha.heading('Roborock', 'title'),
            ha.tile('button.s7_max_ultra_after_meals', columns=6, name={ type: 'entity' }),
            ha.tile('button.s7_max_ultra_full_cleaning', columns=6, name={ type: 'entity' }),
            ha.template(
              'mdi:robot-vacuum',
              "{% set t = states('sensor.s7_max_ultra_cleaning_time') | int(0) %} {% set p = states('sensor.s7_max_ultra_cleaning_progress') | int(0) %} {% set r = (t / p * (100 - p)) | int(0) if p > 0 else 0 %} {{ (t // 60) }}m {{ (t % 60) }}s elapsed · {{ (r // 60) }}m {{ (r % 60) }}s remaining",
              "{{ states('sensor.s7_max_ultra_cleaning_progress') }}% complete",
            ),
          ],
        },
        {
          column_span: 2,
          type: 'grid',
          cards:
           [ha.heading('Flair', 'title')] +
           [flair_zone_card(zone) for zone in flair_zones],
        },
      ],
    },
  ]),
]
