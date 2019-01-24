var Areas;

(function () {

    Areas = [
        //Area1
        {
            "comp":[20, 60, 110, 180, 270, 450, 600],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.03,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.4,
                },
                {
                    "id": "Key",
                    "dropRate": 0.85,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.3,
                },
            ],
            "initialSpeed": 0
        },

        //Area2
        {
            "comp":[30, 70, 140, 220, 320, 460],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.02,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.1,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.46,
                },
                {
                    "id": "Key",
                    "dropRate": 0.75,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.1,
                }
            ],
            "initialSpeed": 0
        },

        //Area3
        {
            "comp":[30, 70, 150, 230, 340],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.019,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.095,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.48,
                },
                {
                    "id": "Key",
                    "dropRate": 0.7,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.05,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.05,
                }
            ],
            "initialSpeed": 1
        },

        //4
        {
            "comp":[30, 80, 180, 300, 500],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.019,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.003,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.095,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.52,
                },
                {
                    "id": "Key",
                    "dropRate": 0.64,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.4,
                },
            ],
            "initialSpeed": 1
        },

        //5
        {
            "comp":[40, 100, 200, 400, 600],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.0187,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.09,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.54,
                },
                {
                    "id": "Key",
                    "dropRate": 0.6,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.32,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.05,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.05,
                }
            ],
            "initialSpeed": 1
        },

        //6
        {
            "comp":[40, 100, 200, 400, 600],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.0184,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.088,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.57,
                },
                {
                    "id": "Key",
                    "dropRate": 0.5,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.15,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.04,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.06,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.06,
                }
            ],
            "initialSpeed": 1
        },

        //7
        {
            "comp":[40, 100, 200, 400, 650],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.018,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.86,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.6,
                },
                {
                    "id": "Key",
                    "dropRate": 0.46,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.10,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.04,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.04,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.05,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.05,
                }
            ],
            "initialSpeed": 1
        },

        //8
        {
            "comp":[40, 120, 240, 460, 700],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.018,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.001,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.001,
                }
            ],
            "dropItems": [
                {
                    "id": "Apple",
                    "dropRate": 0.084,
                },
                {
                    "id": "Berry",
                    "dropRate": 0.05,
                },
                {
                    "id": "Wine",
                    "dropRate": 0.05,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.65,
                },
                {
                    "id": "Key",
                    "dropRate": 0.38,
                }
            ],
            "enemies": [
                {
                    "id": "Mouse",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Frog",
                    "spawnRate": 0.05,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.04,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.04,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.07,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.05,
                }
            ],
            "initialSpeed": 1
        },
    ];

})();