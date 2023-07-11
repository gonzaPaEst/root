export const configSheet = async () => {

  // pass Root sheet object to sheeConfig

  game.pbta.sheetConfig = {
    rollFormula: "2d6",
    rollResults: {
      critical: {
        start: null,
        end: null,
        label: "Triumph!"
      },
      success: {
        start: 10,
        end: null,
        label: "Strong Hit!"
      },
      partial: {
        start: 7,
        end: 9,
        label: "Weak Hit"
      },
      failure: {
        start: null,
        end: 6,
        label: "Miss"
      }
    },
    actorTypes: {
      character: {
        stats: {
          charm: {
            label: "Charm",
            value: 0
          },
          cunning: {
            label: "Cunning",
            value: 0
          },
          finesse: {
            label: "Finesse",
            value: 0
          },
          luck: {
            label: "Luck",
            value: 0
          },
          might: {
            label: "Might",
            value: 0
          }
        },
        attrTop: {
          reputation: {
            label: "YOUR REPUTATION",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "ListMany",
            condition: false,
            options: {
              0: {
                label: "[Text]",
                value: false,
                values: {}
              },
              1: {
                label: "-3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              2: {
                label: "-2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              3: {
                label: "-1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              4: {
                label: "+0",
                value: false,
                values: {
                  0: {
                    value: false
                  }
                }
              },
              5: {
                label: "+1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              6: {
                label: "+2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              7: {
                label: "+3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              8: {
                label: "[Text]",
                value: false,
                values: {}
              },
              9: {
                label: "-3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              10: {
                label: "-2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              11: {
                label: "-1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              12: {
                label: "+0",
                value: false,
                values: {
                  0: {
                    value: false
                  }
                }
              },
              13: {
                label: "+1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              14: {
                label: "+2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              15: {
                label: "+3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              16: {
                label: "[Text]",
                value: false,
                values: {}
              },
              17: {
                label: "-3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              18: {
                label: "-2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              19: {
                label: "-1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              20: {
                label: "+0",
                value: false,
                values: {
                  0: {
                    value: false
                  }
                }
              },
              21: {
                label: "+1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              22: {
                label: "+2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              23: {
                label: "+3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              24: {
                label: "[Text]",
                value: false,
                values: {}
              },
              25: {
                label: "-3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              26: {
                label: "-2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              27: {
                label: "-1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              28: {
                label: "+0",
                value: false,
                values: {
                  0: {
                    value: false
                  }
                }
              },
              29: {
                label: "+1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              30: {
                label: "+2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              31: {
                label: "+3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              32: {
                label: "[Text]",
                value: false,
                values: {}
              },
              33: {
                label: "-3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              34: {
                label: "-2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              35: {
                label: "-1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              36: {
                label: "+0",
                value: false,
                values: {
                  0: {
                    value: false
                  }
                }
              },
              37: {
                label: "+1",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              38: {
                label: "+2",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              39: {
                label: "+3",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  }
                }
              },
              40: {
                label: "---------------NOTORIETY--------------",
                value: false,
                values: {}
              },
              41: {
                label: "-------------------------PRESTIGE---------------------------",
                value: false,
                values: {}
              }
            }
          }
        },
        attrLeft: {
          resource: {
            label: " ",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "ListMany",
            condition: false,
            options: {
              0: {
                label: "INJURY",
                value: false,
                values: {}
              },
              1: {
                label: "",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              2: {
                label: "",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  },
                  6: {
                    value: false
                  },
                  7: {
                    value: false
                  }
                }
              },
              3: {
                label: "EXHAUSTION",
                value: false,
                values: {}
              },
              4: {
                label: "",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              5: {
                label: "",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  },
                  6: {
                    value: false
                  },
                  7: {
                    value: false
                  }
                }
              },
              6: {
                label: "DEPLETION",
                value: false,
                values: {}
              },
              7: {
                label: "",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  }
                }
              },
              8: {
                label: "",
                value: false,
                values: {
                  0: {
                    value: false
                  },
                  1: {
                    value: false
                  },
                  2: {
                    value: false
                  },
                  3: {
                    value: false
                  },
                  4: {
                    value: false
                  },
                  5: {
                    value: false
                  },
                  6: {
                    value: false
                  },
                  7: {
                    value: false
                  }
                }
              }
            }
          },
          hold: {
            label: "Hold",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Number",
            value: 0
          },
          value: {
            label: "Equipment & Load",
            description: "Starting Value",
            customLabel: false,
            userLabel: false,
            type: "Number",
            value: 0
          },
          carrying: {
            label: "Carrying",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Number",
            value: 0
          },
          burdened: {
            label: "Burdened (4+Might)",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Number",
            value: 0
          },
          max: {
            label: "Max (Twice Burdened)",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Number",
            value: 0
          },
          nature: {
            label: "Nature",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "LongText",
            value: ""
          },
          drives: {
            label: "Drives",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "LongText",
            value: ""
          },
          connections: {
            label: "Connections",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "LongText",
            value: ""
          }
        },
        moveTypes: {
          basic: {
            label: "Basic Moves",
            moves: []
          },
          playbook: {
            label: "Playbook Moves",
            moves: []
          },
          weapon: {
            label: "Weapon Moves",
            moves: []
          },
          travel: {
            label: "Travel Moves",
            moves: []
          },
          reputation: {
            label: "Reputation Moves",
            moves: []
          }
        },
        equipmentTypes: {
          equipment: {
            label: "Equipment",
            moves: []
          }
        }
      },
      npc: {
        attrTop: {
          injury: {
            label: "Injury",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Resource",
            value: 0,
            max: 0
          },
          exhaustion: {
            label: "Exhaustion",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Resource",
            value: 0,
            max: 0
          },
          wear: {
            label: "Wear",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Resource",
            value: 0,
            max: 0
          }
        },
        attrLeft: {
          morale: {
            label: "Morale",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Number",
            value: 0
          },
          harm: {
            label: "Harm Dealt",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "Text",
            value: ""
          },
          drive: {
            label: "Drive",
            description: null,
            customLabel: false,
            userLabel: false,
            type: "LongText",
            value: ""
          }
        },
        moveTypes: {
          moves: {
            label: "Moves",
            moves: []
          }
        },
        equipmentTypes: {
          equipment: {
            label: "Equipment",
            moves: []
          }
        }
      }
    }
  }
  
  // check if users wants to override settings; if not, hide all PbtA sheet options
  let overrideSettings = await game.settings.get('root', 'settings-override');
  
  if (!overrideSettings) {
    await game.settings.set('pbta', 'advForward', true);
    await game.settings.set('pbta', 'hideRollFormula', true);
    await game.settings.set('pbta', 'hideForward', false);
    await game.settings.set('pbta', 'hideOngoing', false);
    await game.settings.set('pbta', 'hideRollMode', true);
    await game.settings.set('pbta', 'hideUses', true);
  }
  
}