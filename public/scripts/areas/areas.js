var Areas;

(function () {

    Areas = [
        //Area1
        {
            "comp":[20, 60, 110, 180, 270, 450, 600],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.032,
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
                    "dropRate": 0.15,
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
                    "dropRate": 0.9,
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
                    "spawnRate": 0.026,
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
                    "dropRate": 0.15,
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
                    "dropRate": 0.78,
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
                    "dropRate": 0.68,
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
                    "dropRate": 0.092,
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
                    "dropRate": 0.62,
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
                    "dropRate": 0.089,
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
                    "dropRate": 0.55,
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
                    "dropRate": 0.87,
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
                    "dropRate": 0.48,
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
                    "dropRate": 0.085,
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
                    "dropRate": 0.4,
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