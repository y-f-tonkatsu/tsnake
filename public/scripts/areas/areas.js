var Areas;

(function () {

    Areas = [
        //1
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    //"spawnRate": 0.03,
                    "spawnRate": 0.2,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.4,
                },
            ],
            "initialSpeed": 4
        },

        //2
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.2,
                }
            ],
            "initialSpeed": 4
        },

        //3
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.2,
                }
            ],
            "initialSpeed": 4
        },

        //4
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.5,
                },
            ],
            "initialSpeed": 4
        },

        //5
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Mouse",
                    "spawnRate": 0.4,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.2,
                }
            ],
            "initialSpeed": 4
        },

        //6
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.3,
                }
            ],
            "initialSpeed": 4
        },

        //7
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.8,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.3,
                }
            ],
            "initialSpeed": 4
        },

        //8
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Berry",
                    "spawnRate": 0.1,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.8,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.9,
                }
            ],
            "enemies": [
                {
                    "id": "Mouse",
                    "spawnRate": 0.4,
                },
                {
                    "id": "Spider",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Bear",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Cancer",
                    "spawnRate": 0.3,
                },
                {
                    "id": "Hedgehog",
                    "spawnRate": 0.3,
                }
            ],
            "initialSpeed": 4
        },
    ];

})();