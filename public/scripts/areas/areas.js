var Areas;

(function () {

    Areas = [
        //1
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
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.8,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
            ],
            "initialSpeed": 0
        },

        //2
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
                    "dropRate": 0.5,
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
                    "spawnRate": 0.1,
                }
            ],
            "initialSpeed": 0
        },

        //3
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
                    "dropRate": 0.5,
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
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.7,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.3,
                },
            ],
            "initialSpeed": 1
        },

        //5
        {
            "comp":[40, 100, 200, 400],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
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
                    "dropRate": 0.5,
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
                    "spawnRate": 0.3,
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
            "initialSpeed": 2
        },

        //6
        {
            "comp":[40, 100, 200, 400],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
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
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.5,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.12,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.08,
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
            "initialSpeed": 2
        },

        //7
        {
            "comp":[40, 100, 200, 400],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
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
                    "dropRate": 0.5,
                },
                {
                    "id": "Key",
                    "dropRate": 0.5,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.5,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.1,
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
            "initialSpeed": 2
        },

        //8
        {
            "comp":[50, 120, 240, 460],
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.01,
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
                    "dropRate": 0.5,
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
                    "spawnRate": 0.05,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.1,
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
            "initialSpeed": 3
        },
    ];

})();