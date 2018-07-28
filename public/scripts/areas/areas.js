var Areas;

(function () {

    Areas = [
        {
            "items": [
                {
                    "id": "Apple",
                    "spawnRate": 0.2,
                },
                {
                    "id": "Wine",
                    "spawnRate": 0.03,
                }
            ],
            "dropItems": [
                {
                    "id": "Berry",
                    "dropRate": 0.6,
                },
                {
                    "id": "Coin",
                    "dropRate": 0.7,
                },
                {
                    "id": "Key",
                    "dropRate": 0.2,
                }
            ],
            "enemies": [
                {
                    "id": "Frog",
                    "spawnRate": 0.4,
                    "dropItemRate": 0.4
                }
            ],
            "initialSpeed": 4
        }, {
            "items": ["Apple", "Coin", "Key", "Wine", "Berry"],
            "enemies": ["frog"],
            "spawnEnemyRate": 0.5,
            "spawnItemRate": 0.3,
            "initialSpeed": 8
        }
    ];

})();